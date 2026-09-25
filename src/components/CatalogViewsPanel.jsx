import React, { useMemo, useRef, useState } from 'react';
import { Camera, Check, StopCircle, AlertCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { plainGenerationError } from '../utils/friendlyError';
import { putImageBytes, registerImage, dataUrlToFile } from '../services/image.service';
import { uploadImageFile } from '../services/image.service';
import {
  VIEW_ORDER, pickRandomModelId, resolveTryOnCategory, streamCatalog
} from '../lib/catalogGeneration';

/**
 * The four catalog views, made from a photograph the shop already has.
 *
 * Until now this only existed in the Add a product wizard, which meant it only existed during
 * the one minute somebody was first typing a product in. Everything afterwards -- a photograph
 * taken later, a product imported from a sheet, a colour added months on -- had the upload box
 * and nothing else. A shop with one good photograph of a saree could not turn it into a set.
 *
 * It also blocked the other half. "The colours with no photograph" copies from a GENERATED front
 * view, so a product whose only photograph was uploaded by hand never qualified: the card simply
 * did not appear, with nothing to say why. Making the views here is what unlocks it -- run this
 * once on the colour that has a photograph, and the other colours become available.
 *
 * What it does NOT do is reclassify the shop's own photograph. The wizard keeps the picture it
 * generated from as a hidden flat-lay reference, which is right there because the shop uploaded
 * it for that purpose. Here it is a photograph they chose to publish, and quietly hiding it from
 * their shop because they pressed a button about something else would be taking a decision that
 * is theirs.
 */
export default function CatalogViewsPanel({ productId, dressType, variants, images, onChanged }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState([]);
  const [failure, setFailure] = useState(null);
  const abortRef = useRef(null);
  const stoppedRef = useRef(false);

  const category = useMemo(() => resolveTryOnCategory(dressType), [dressType]);

  /** One entry per colour: several variants of one colour share one set of photographs. */
  const colours = useMemo(() => {
    const byColour = new Map();
    for (const v of variants || []) {
      const name = v.colorName || null;
      if (!name) continue;
      const key = name.toLowerCase();
      if (!byColour.has(key)) byColour.set(key, { name, hex: v.hexCode || null, variantIds: [], images: [] });
      byColour.get(key).variantIds.push(v.id);
    }
    for (const img of images || []) {
      for (const c of byColour.values()) if (c.variantIds.includes(img.variantId)) c.images.push(img);
    }
    return [...byColour.values()];
  }, [variants, images]);

  /*
   * A colour worth offering this for: it has a photograph to work from, and it has no generated
   * views yet. A colour that already has its set is left alone -- running again would spend the
   * allowance to replace pictures the shop has already seen and kept.
   */
  /*
   * Is there already a generated front view somewhere on this product? If so, the colours panel
   * below can fill an empty colour from it -- no photograph needed, nothing for the shop to go
   * and take. That is the better route whenever it exists.
   *
   * Same test the colours panel uses, deliberately: the two must agree about what counts, or they
   * both offer to fill the same colour and the shop has to guess which button is the right one.
   * Seen on screen before this: "CHOOSE A FLAT-LAY" and "MAKE THIS COLOUR" side by side, both
   * pointing at Red.
   */
  const somethingToCopyFrom = useMemo(
    () => colours.some(c => c.images.some(i => i.generated && i.view === 'front')),
    [colours]
  );

  const candidates = useMemo(
    () => colours.filter(c => {
      if (c.images.some(i => i.generated && i.view)) return false;   // already has its set
      if (c.images.length > 0) return true;                          // has a photograph to work from
      // Nothing of its own: only worth a flat-lay when there is nothing to copy from either.
      return !somethingToCopyFrom;
    }),
    [colours, somethingToCopyFrom]
  );

  /*
   * What to generate FROM, in the order that respects what the shop meant.
   *
   * A flat-lay handed over for this job comes first, then the main photograph, then anything.
   * A colour with nothing is not a dead end any more -- it is offered the flat-lay upload below,
   * which was the case this panel originally could not help with at all: a product published
   * without pictures for every colour had no way to give one now and generate from it.
   */
  const sourceFor = (c) =>
    c.images.find(i => i.imageType === 'RAW_UPLOAD')
    ?? c.images.find(i => i.isPrimary)
    ?? c.images[0]
    ?? null;

  const [chosen, setChosen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const flatLayRef = useRef(null);
  const target = candidates.find(c => c.name === chosen) ?? candidates[0] ?? null;
  const source = target ? sourceFor(target) : null;

  /*
   * The flat-lay path: a colour with no photograph at all.
   *
   * Uploaded as RAW_UPLOAD rather than GALLERY, which is what keeps it out of the shop -- the
   * gallery shows it dimmed and labelled NOT IN YOUR SHOP, with a way to publish it after all if
   * the shop decides they want it there. Then it generates straight away, because choosing a
   * flat-lay IS the instruction; making somebody press a second button afterwards would be asking
   * them to confirm something they already said.
   */
  const chooseFlatLay = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !target) return;
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return toast.error('This is an iPhone HEIC photo. Share it as a JPEG (or set the camera to "Most Compatible") and choose it again.');
    }
    setUploading(true);
    try {
      const saved = await uploadImageFile(productId, file, {
        variantId: target.variantIds[0],
        imageType: 'RAW_UPLOAD',
        altText: `${target.name}, flat-lay`
      });
      /*
       * The row, not the envelope. uploadImageFile hands back what the API returned, and this
       * backend wraps everything in { success, data } -- so reading .url straight off it gave
       * undefined, the generation decided it had no source and returned without a word. The
       * flat-lay uploaded, nothing was made, and nothing said why.
       */
      const image = saved?.data ?? saved;
      if (!image?.url) throw new Error('That picture was saved but could not be read back.');
      onChanged?.();
      // Straight into the generation, with the picture just stored as its source.
      await run(image);
    } catch (err) {
      console.error('Flat-lay upload failed:', err);
      toast.error(err?.message || 'That picture could not be saved. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const stop = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    setRunning(false);
  };

  const run = async (fromImage) => {
    if (!target) return;
    const source = fromImage ?? sourceFor(target);
    if (!source?.url) return;

    stoppedRef.current = false;
    setRunning(true);
    setDone([]);
    setFailure(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let orderIndex = 0;

    try {
      await streamCatalog({
        payload: {
          modelId: pickRandomModelId(category),
          category,
          jobId: `views-${target.name}`,
          // A URL, not bytes: the far end fetches it, so nothing is re-encoded and nothing
          // large goes back up the wire.
          saree: source.url
        },
        signal: controller.signal,
        onView: async (view, dataUrl) => {
          // Saved as it lands, so a run that is stopped or fails on its fourth view keeps the
          // three that arrived.
          const stored = await putImageBytes(productId, dataUrlToFile(dataUrl, `${view}.jpg`));
          for (const variantId of target.variantIds) {
            await registerImage(productId, stored, {
              variantId,
              // The front becomes the main photograph; the shop's own picture stays, but the
              // generated front is the one a catalogue wants to lead with.
              isPrimary: view === 'front',
              altText: `${target.name}, ${view} view`,
              imageType: 'GALLERY',
              generated: true,
              view,
              generatedFromId: source.id,
              orderIndex: VIEW_ORDER.indexOf(view) < 0 ? orderIndex : VIEW_ORDER.indexOf(view)
            });
          }
          orderIndex++;
          setDone(prev => [...prev, view]);
        }
      });
    } catch (err) {
      if (err?.name !== 'AbortError' && !stoppedRef.current) {
        console.error('Catalog views failed:', err);
        setFailure(plainGenerationError(err));
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      onChanged?.();
      if (!stoppedRef.current && !failure) {
        toast.success('The four views are made. Look through them below.');
      }
    }
  };

  if (!category || !target) return null;

  return (
    <div style={{
      border: '1px solid var(--border-light)', borderRadius: '12px',
      padding: '16px', marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Camera size={18} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
          Make the four catalog views
        </h3>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        {source ? (
          <>
            We take your photograph of the <b>{target.name}</b> one and make the four views a
            catalogue wants &mdash; front, left, right and back &mdash; on a model.{' '}
            {source.imageType === 'RAW_UPLOAD'
              ? 'Your flat-lay stays out of your shop.'
              : 'Your own photograph stays exactly where it is.'}{' '}
            Photograph the other views yourself instead if you would rather.
          </>
        ) : (
          <>
            <b>{target.name}</b> has no photograph yet. Give us a flat-lay of it &mdash; the piece
            laid out flat on a table &mdash; and we make the four views from that. The flat-lay is
            kept as a reference and <b>is not shown in your shop</b>, so a picture of cloth on a
            table never ends up in your shop window.
          </>
        )}
      </p>

      {candidates.length > 1 && !running && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Which colour to photograph
          </label>
          <select className="input-field" value={target.name}
            onChange={(e) => setChosen(e.target.value)} style={{ maxWidth: '260px' }}>
            {candidates.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      )}

      {!running && (
        <>
          <input ref={flatLayRef} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={chooseFlatLay} style={{ display: 'none' }} />
          <button type="button" className="btn btn-primary"
            onClick={() => (source ? run() : flatLayRef.current?.click())}
            disabled={uploading}
            style={{ padding: '9px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {source
              ? 'MAKE THE FOUR VIEWS'
              : <><Upload size={15} /> {uploading ? 'UPLOADING…' : 'CHOOSE A FLAT-LAY'}</>}
          </button>
        </>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {/*
              Our words, not the far end's. It reports things like "Starting AI Generation
              Pipeline......", which is a sentence written for whoever built it -- a saree shop
              owner should not be reading about pipelines on their own product screen.
            */}
            Making the {target.name} views&hellip;
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {done.length} of 4 done. About a minute in all.
            </span>
          </p>
          <button type="button" className="btn" onClick={stop}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
            <StopCircle size={16} /> Stop
          </button>
        </div>
      )}

      {done.length > 0 && !running && (
        <p style={{
          fontSize: '13px', color: 'var(--success, #16A34A)', marginTop: '10px',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Check size={16} /> Made: {done.join(', ')}. The other colours can be made from these now.
        </p>
      )}

      {failure && (
        <p style={{
          fontSize: '13px', color: '#B45309', margin: '6px 0 0',
          display: 'flex', alignItems: 'flex-start', gap: '6px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{failure}</span>
        </p>
      )}
    </div>
  );
}
