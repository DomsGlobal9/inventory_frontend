import React, { useMemo, useRef, useState } from 'react';
import { Palette, Check, StopCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { plainGenerationError } from '../utils/friendlyError';
import { putImageBytes, registerImage, dataUrlToFile } from '../services/image.service';
import {
  VIEW_ORDER, pickRandomModelId, resolveTryOnCategory, streamCatalog
} from '../lib/catalogGeneration';

/**
 * The other colours, on a product that is already published.
 *
 * The wizard offers this while a product is being added, which covers the common case. It does
 * not cover the two that come later and were the whole reason to ask: a colour added to a
 * product months after it went online, and a colour the shop looked at afterwards and did not
 * like. Both left them with the upload box and nothing else -- so the feature existed only
 * during the one minute they were first typing the product in.
 *
 * Differences from the wizard's version, all of them because the product now really exists:
 *
 *  - The source photograph is a URL on our storage rather than bytes in the browser, and the
 *    far end takes a URL directly. Nothing is re-encoded and nothing large is sent.
 *  - Each view is saved as it arrives, against every variant of the target colour -- red/S,
 *    red/M and red/L are one colour with one set of photographs.
 *  - `generatedFromId` records which photograph it came from, so "where did this come from"
 *    stays answerable after the fact.
 */
export default function ColourVariantsPanel({ productId, dressType, variants, images, onChanged }) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(null);
  const [made, setMade] = useState([]);
  const [failures, setFailures] = useState([]);
  const [planned, setPlanned] = useState(0);
  const abortRef = useRef(null);
  const stoppedRef = useRef(false);

  const category = useMemo(() => resolveTryOnCategory(dressType), [dressType]);

  /*
   * One entry per COLOUR, not per variant. A colour is several variants and they share one set
   * of photographs, so asking per variant would generate the same pictures three times over and
   * bill for all three.
   */
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

  // Somewhere to copy FROM: a colour that already has a generated front view. That is the
  // photograph the far end works best from, and the one every other colour is matched against.
  const source = useMemo(() => {
    for (const c of colours) {
      const front = c.images.find(i => i.generated && i.view === 'front');
      if (front) return { colour: c, front };
    }
    return null;
  }, [colours]);

  // Colours with no photograph at all. A colour that already has one is never touched.
  const targets = useMemo(
    () => colours.filter(c => c.images.length === 0 && c.variantIds.length > 0),
    [colours]
  );

  const nothingToOffer = !category || !source || targets.length === 0;
  if (nothingToOffer && made.length === 0 && failures.length === 0) return null;

  const stop = async () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    if (current?.jobId) await api.post('/catalog-tryon/cancel-job', { jobId: current.jobId }).catch(() => {});
    setRunning(false);
    setCurrent(null);
  };

  const run = async () => {
    const queue = targets;
    setPlanned(queue.length);
    setRunning(true);
    setMade([]);
    setFailures([]);
    stoppedRef.current = false;

    for (const target of queue) {
      if (stoppedRef.current) break;

      const jobId = `${target.name}-${target.hex || ''}`;
      setCurrent({ jobId, name: target.name });

      const controller = new AbortController();
      abortRef.current = controller;
      let saved = 0;
      let orderIndex = 0;

      try {
        await streamCatalog({
          payload: {
            modelId: pickRandomModelId(category),
            category,
            jobId,
            // A URL, not bytes. The far end fetches it itself, so nothing is re-encoded here
            // and a four-colour run does not push megabytes back up the wire four times.
            saree: source.front.url,
            // Name and hex together: the name is what actually steers the picture, the hex is
            // kept as a reference. Border and blouse are deliberately left alone -- they are
            // usually a contrast the shop chose, and recolouring them sells a garment that
            // does not exist.
            color: { name: target.name, hex: (target.hex || '').toLowerCase() || undefined }
          },
          signal: controller.signal,
          onView: async (view, dataUrl) => {
            // Saved as it lands. A run that is stopped, or fails on its fourth view, keeps
            // the three that arrived rather than throwing the lot away.
            const stored = await putImageBytes(productId, dataUrlToFile(dataUrl, `${view}.jpg`));
            for (const variantId of target.variantIds) {
              await registerImage(productId, stored, {
                variantId,
                // The front leads, or the first to arrive if the front never does -- a colour
                // with no main photograph falls back to another colour's.
                isPrimary: view === 'front' || orderIndex === 0,
                altText: `${target.name}, ${view} view`,
                imageType: 'GALLERY',
                generated: true,
                view,
                generatedFromId: source.front.id,
                orderIndex: VIEW_ORDER.indexOf(view) < 0 ? orderIndex : VIEW_ORDER.indexOf(view)
              });
            }
            orderIndex++;
            saved++;
          }
        });

        if (saved > 0) setMade(prev => [...prev, target.name]);
      } catch (err) {
        if (err?.name === 'AbortError' || stoppedRef.current) break;
        console.error(`Colour variant failed for ${target.name}:`, err);
        setFailures(prev => [...prev, { name: target.name, why: plainGenerationError(err) }]);
      } finally {
        abortRef.current = null;
      }
    }

    setCurrent(null);
    setRunning(false);
    onChanged?.();
    if (!stoppedRef.current) toast.success('The colours are made. Look through them below.');
  };

  return (
    <div style={{
      border: '1px solid var(--border-light)', borderRadius: '12px',
      padding: '16px', marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Palette size={18} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
          The colours with no photograph
        </h3>
      </div>

      {targets.length > 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          We take the front view of the {source.colour.name} one and put the same piece in{' '}
          <b>{targets.map(t => t.name).join(', ')}</b>. The weave, the border, the blouse and the
          model stay as they are &mdash; only the colour of the cloth changes. Photograph any of
          them yourself instead if you would rather.
        </p>
      )}

      {!running && targets.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={run}
          style={{ padding: '9px 16px', borderRadius: '8px' }}>
          MAKE {targets.length === 1 ? 'THIS COLOUR' : `THESE ${targets.length} COLOURS`}
        </button>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            Making the {current?.name} one&hellip;
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {made.length} of {planned} done. About a minute each.
            </span>
          </p>
          <button type="button" className="btn" onClick={stop}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
            <StopCircle size={16} /> Stop
          </button>
        </div>
      )}

      {made.length > 0 && !running && (
        <p style={{ fontSize: '13px', color: 'var(--success, #16A34A)', marginTop: '10px',
          display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={16} /> Made: {made.join(', ')}.
        </p>
      )}

      {failures.map((f, n) => (
        <p key={n} style={{ fontSize: '13px', color: '#B45309', margin: '6px 0 0',
          display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span><b>{f.name}</b> &mdash; {f.why}</span>
        </p>
      ))}
    </div>
  );
}
