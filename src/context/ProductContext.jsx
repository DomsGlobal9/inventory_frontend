import React, { createContext, useContext, useState } from 'react';

const ProductContext = createContext();

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

  const resetProductData = () => {
    setProductData(initialData);
  }

  return (
    <ProductContext.Provider value={{ productData, updateProductData, setProductData, loadProductForEdit, resetProductData, photosFor, setPhotosFor }}>
      {children}
    </ProductContext.Provider>
  );
};
