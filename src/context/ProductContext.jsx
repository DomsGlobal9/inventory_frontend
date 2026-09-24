import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { draftKeyFor, loadDraft, saveDraft, clearDraft } from '../lib/draftStore';

const ProductContext = createContext();

/** How long after the last keystroke the draft is written. */
const SAVE_AFTER_MS = 400;

/**
 * Is there anything in this form worth keeping?
 *
 * An empty form must not be saved as a draft. It costs nothing to store, but it makes the
 * answer to "do you have unfinished work" a lie: the next visit would put back nothing at all
 * and announce that it had done so, over a form the person is looking at for the first time.
 *
 * Pressing "Start fresh" is what proved it -- the draft was deleted and the newly emptied form
 * saved itself straight back over the top, a fifth of a second later.
 *
 * Deliberately not a deep comparison against initialData: category and productType arrive with
 * defaults nobody chose, so a form holding only those two is still an empty form.
 */
function hasAnything(d) {
  if (!d) return false;
  const typed = ['title', 'description', 'dressType', 'fabric', 'craft', 'brand', 'price', 'costPrice', 'supplierId'];
  if (typed.some(k => String(d[k] ?? '').trim() !== '')) return true;
  if ((d.selectedSizes?.length ?? 0) > 0 || (d.selectedColors?.length ?? 0) > 0) return true;
  if (Object.keys(d.units ?? {}).length > 0 || Object.keys(d.variantPrices ?? {}).length > 0) return true;
  for (const set of Object.values(d.variantPhotos ?? {})) {
    const source = set?.sourceFiles;
    const slots = Array.isArray(source) ? source.filter(Boolean) : Object.values(source ?? {}).filter(Boolean);
    if (slots.length > 0) return true;
    if ((set?.extraFiles ?? []).length > 0) return true;
    if (Object.keys(set?.generatedViews ?? {}).length > 0) return true;
  }
  return false;
}

export const useProduct = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const initialData = {
    // General Info
    title: '',
    description: '',
    category: 'WOMEN',
    productType: 'Ready to Wear',
    dressType: '',
    fabric: '',
    craft: '',
    brand: '',
    
    // Measurements / Pricing
    price: '',
    // What the stock cost. Asked for because not asking is what produced a shop holding 50
    // sarees the system believed were free -- the first purchase order was then averaged
    // against that zero and priced the saree at 98 rupees. Optional, because a shop that
    // genuinely does not know can leave it and correct it later.
    costPrice: '',
    // Who it was bought from. The supplier link used to be created only when a purchase
    // order was raised, so the Suppliers screen showed an empty item list for every supplier
    // until you had already ordered from them, and reordering could not suggest anyone.
    supplierId: '',
    selectedSizes: [], // e.g. ["S", "M"]
    selectedColors: [], // e.g. ["red_#FF0000", "blue_#0000FF"]
    units: {}, // e.g. { "red_#FF0000": { "S": 10, "M": 5 } }
    // Off by default: most shops sell every size of one saree at one price, and a grid of
    // price boxes nobody needs is a grid of boxes somebody mistypes. On, each colour/size
    // carries its own price -- which is real (a plus size or a zari border costs more).
    perVariantPricing: false,
    variantPrices: {}, // same shape as units: { "red_#FF0000": { "S": 1250 } }
    
    /*
     * Photographs, one set PER COLOUR.
     *
     * They used to be one pile for the whole product: a single cover and a single list of
     * extras, shown for every colour the shop sold. For a saree in five colours that is a
     * lie -- four of those colours were being sold with a photograph of a different one,
     * and nothing on the screen said which colour still had no picture of its own.
     *
     * Keyed by the same colour code selectedColors uses ("red_#FF0000"), so the photographs
     * and the stock numbers in `units` are keyed the same way and cannot drift apart.
     *
     *   variantPhotos["red_#FF0000"] = {
     *     sourceFiles:    { saree: File } | [File]   what the shop photographed
     *     generatedViews: { front: dataUrl, ... }    what Try-On made from it
     *   }
     *
     * Nothing here is required. A colour with no photographs publishes perfectly well and
     * can be given one later from the product's Photos tab -- an empty slot must never be
     * a locked door.
     */
    variantPhotos: {}
  };

  const [productData, setProductData] = useState(initialData);

  const updateProductData = (key, value) => {
    setProductData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * What one colour has been photographed with so far. Never null, so a caller can read
   * `.sourceFiles` off it without checking first.
   */
  const photosFor = (colorCode) =>
    productData.variantPhotos?.[colorCode] ?? { sourceFiles: {}, generatedViews: {} };

  /**
   * Change one colour's photographs, leaving every other colour alone.
   *
   * Written as a functional update rather than reading photosFor() and spreading it: the
   * uploader saves a file and starts a generation in the same tick, and reading the old
   * object first meant whichever finished second overwrote the other.
   */
  const setPhotosFor = (colorCode, patch) => {
    setProductData(prev => {
      const all = prev.variantPhotos || {};
      const mine = all[colorCode] ?? { sourceFiles: {}, generatedViews: {} };
      return { ...prev, variantPhotos: { ...all, [colorCode]: { ...mine, ...patch } } };
    });
  };

  const loadProductForEdit = (product) => {
    setProductData(product);
  };

  /*
   * ── Keeping the work ────────────────────────────────────────────────────────────────────
   *
   * Everything above lived in React state and nowhere else. A refresh, a closed tab, a flat
   * battery or the end of a shift threw away a name, five colours, the stock for each of them
   * and three photographs -- and the step ticks at the top still read "General Information:
   * done" over a form with nothing in it, so the app looked broken rather than forgetful.
   *
   * Saved to IndexedDB (see lib/draftStore) under this person's id AND this shop's, because a
   * till is shared: the next person to sign in must not find the last one's half-written saree.
   * That scoping is also what lets it survive signing out -- it is never deleted on the way
   * out, only made invisible to everybody else.
   */
  const { clientId, user } = useAuth();
  const draftKey = draftKeyFor(clientId, user?.id);

  /** The step they were last on, so "Add product" can put them back rather than at the start. */
  const [lastStep, setLastStep] = useState(null);
  /** True once a saved draft has been put back, so the wizard can say so. */
  const [restored, setRestored] = useState(false);
  /*
   * Nothing is written until a restore has been attempted.
   *
   * Without this the provider mounts with the empty initialData, the save effect fires, and the
   * blank form is written over the draft a moment before the draft is read -- so opening the
   * wizard would be the one reliable way to destroy your own work.
   */
  const readyToSave = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    readyToSave.current = false;
    setRestored(false);

    if (!draftKey) return undefined;   // signed out: nothing to read and nothing to write

    loadDraft(draftKey).then(row => {
      if (cancelled) return;
      if (hasAnything(row?.productData)) {
        setProductData(prev => ({ ...prev, ...row.productData }));
        setLastStep(row.lastStep ?? null);
        setRestored(true);
      }
      readyToSave.current = true;
    });

    return () => { cancelled = true; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !readyToSave.current) return undefined;
    // Debounced: a name is twenty keystrokes and each one would otherwise be its own write.
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      /*
       * An empty form never becomes a draft -- and never deletes one either.
       *
       * Not saving is what stops "you have unfinished work" being true for ever after somebody
       * merely opened the wizard once. Not DELETING is the more important half: this runs four
       * tenths of a second after any moment the form happens to look empty, and a form looks
       * empty while a restore is still in flight, during a hot reload, and for the one render
       * after a crash the error boundary recovered from. Deleting on any of those would throw
       * away real work to tidy up storage. The only things that remove a draft are somebody
       * pressing "Start fresh" and the product being published -- both of which mean it.
       */
      if (hasAnything(productData)) saveDraft(draftKey, { productData, lastStep });
    }, SAVE_AFTER_MS);
    return () => clearTimeout(saveTimer.current);
  }, [draftKey, productData, lastStep]);

  /** Remembers which step they are on. Called by each step as it renders. */
  const rememberStep = (step) => setLastStep(prev => (prev === step ? prev : step));

  /**
   * Where "Add product" should go.
   *
   * The step they stopped on, not the first one. Both Add Product buttons used to call
   * resetProductData() first -- which, now that a draft is kept, would have thrown away the
   * half-written saree of anybody who pressed the button to look at it. Starting a genuinely
   * new product is the "Start fresh" button on the restored bar, which is one press away and
   * says what it does.
   */
  const resumePath = () => `/add/${lastStep && lastStep !== 'preview' ? lastStep : 'general'}`;

  /**
   * Back to an empty form, and the saved draft gone with it.
   *
   * Used by "Start fresh" and by a successful publish. Deliberately clears storage FIRST: if
   * the delete failed after the state was emptied, the next save would write the empty form
   * over the draft anyway, so the order only matters for the case where the delete throws --
   * and there the draft surviving is the better outcome.
   */
  const resetProductData = () => {
    clearTimeout(saveTimer.current);
    clearDraft(draftKey);
    setProductData(initialData);
    setLastStep(null);
    setRestored(false);
  };

  return (
    <ProductContext.Provider value={{
      productData, updateProductData, setProductData, loadProductForEdit, resetProductData,
      photosFor, setPhotosFor,
      /** True when this form was put back from a saved draft rather than started empty. */
      restored,
      /** Stop saying "we put your work back" once they have seen it. */
      dismissRestored: () => setRestored(false),
      lastStep, rememberStep, resumePath
    }}>
      {children}
    </ProductContext.Provider>
  );
};
