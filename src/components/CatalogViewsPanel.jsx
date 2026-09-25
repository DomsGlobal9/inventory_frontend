import React, { useMemo, useRef, useState } from 'react';
import { Camera, Check, StopCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { plainGenerationError } from '../utils/friendlyError';
import { putImageBytes, registerImage, dataUrlToFile } from '../services/image.service';
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
  const [step, setStep] = useState(null);
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
  const candidates = useMemo(
    () => colours.filter(c =>
      c.images.length > 0 && !c.images.some(i => i.generated && i.view)
    ),
    [colours]
  );

  const [chosen, setChosen] = useState(null);
  const target = candidates.find(c => c.name === chosen) ?? candidates[0] ?? null;

  const stop = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    setRunning(false);
    setStep(null);
  };

  const run = async () => {
    if (!target) return;
    // The best photograph to work from is the main one if there is one, else the first.
    const source = target.images.find(i => i.isPrimary) ?? target.images[0];
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
        onStatus: (s) => setStep(s),
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
      setStep(null);
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
        We take your photograph of the <b>{target.name}</b> one and make the four views a
        catalogue wants &mdash; front, left, right and back &mdash; on a model. Your own
        photograph stays exactly where it is. Photograph the other views yourself instead if you
        would rather.
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
        <button type="button" className="btn btn-primary" onClick={run}
          style={{ padding: '9px 16px', borderRadius: '8px' }}>
          MAKE THE FOUR VIEWS
        </button>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {step || `Making the ${target.name} views`}&hellip;
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
