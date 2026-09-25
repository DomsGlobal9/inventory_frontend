import React, { useMemo, useRef, useState } from 'react';
import { Palette, Check, StopCircle, AlertCircle } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { api } from '../lib/api';
import { plainGenerationError } from '../utils/friendlyError';
import {
  pickRandomModelId, resolveTryOnCategory, streamCatalog
} from '../lib/catalogGeneration';

/**
 * The same saree, in the colours it also comes in.
 *
 * A shop photographs one colour. The rest are the same garment in a different shade, and
 * photographing each of them is the tedious part of putting a product online -- so this takes
 * the flat-lay that has already been photographed and asks for it in each remaining colour.
 *
 * Deliberately one colour at a time, not all at once:
 *
 *  - The far end runs a shop's jobs under one name per job, and gives a 429 when its slots are
 *    full. Five at once is the shape most likely to be refused halfway through and leave a
 *    product half photographed.
 *  - Each colour costs four image calls from the shop's hourly allowance. Spent in a burst, a
 *    shop can exhaust it on one product and find the next one refused with no idea why.
 *  - A shop watching this wants to see it happening. One at a time with the colour named is
 *    something to read; five spinners is something to worry about.
 *
 * What it does NOT do is claim the photograph belongs to the new colour. Only the generated
 * views are stored against it -- `sourceFiles` stays empty -- so the red flat-lay never turns
 * up in the blue one's gallery. The shop can still add real photographs of any colour, and
 * they sit alongside these exactly as they do for the colour that was actually photographed.
 */
export default function ColourVariantMaker({ colourList, sourceCode, colorInfoFor }) {
  const { productData, photosFor, setPhotosFor } = useProduct();

  const [running, setRunning] = useState(false);
  const [doneCodes, setDoneCodes] = useState([]);
  const [current, setCurrent] = useState(null);   // { code, name, status }
  const [failures, setFailures] = useState([]);   // [{ name, why }]
  const [planned, setPlanned] = useState(0);      // how many this run set out to make
  const abortRef = useRef(null);
  const stoppedRef = useRef(false);

  const category = useMemo(
    () => resolveTryOnCategory(productData.dressType), [productData.dressType]
  );

  /*
   * The FRONT VIEW we already made, not the flat-lay it was made from.
   *
   * Sending the flat-lay would have each colour work out its own model, pose, lighting and
   * backdrop from scratch, so a saree in five colours comes back as five slightly different
   * photoshoots -- the one thing a colour picker on a product page makes obvious, because the
   * shopper flicks between them and everything twitches.
   *
   * From the finished front view, every colour is the same model standing the same way in the
   * same studio with only the cloth changed. It also matches how the far end works: it makes
   * the new colour's front first and derives back, side and sitting from THAT -- so the better
   * the front going in, the tighter the set coming out.
   */
  const source = photosFor(sourceCode);
  const sourceFront = source?.generatedViews?.front || null;

  // Only the colours that have nothing of their own yet. A colour the shop has already
  // photographed, or already made, is left alone -- this must never quietly replace work.
  // Read straight off variantPhotos rather than through photosFor, so the list is recomputed
  // the moment a colour gains a photograph -- including one this component just made.
  const allPhotos = productData.variantPhotos;
  const targets = useMemo(() => colourList.filter(c => {
    if (!c.code || c.code === sourceCode) return false;
    const set = allPhotos?.[c.code] || {};
    const hasOwn = Object.values(set.sourceFiles || {}).some(Boolean) || (set.extraFiles || []).length > 0;
    const hasMade = Object.keys(set.generatedViews || {}).length > 0;
    return !hasOwn && !hasMade;
  }), [colourList, sourceCode, allPhotos]);

  /*
   * Nothing to offer: no model for this garment, nothing generated to copy, or every other
   * colour already has photographs.
   *
   * `doneCodes`/`failures` keep it on screen after the last colour is made. Without them the
   * component vanishes the instant it succeeds -- targets empties, this returns null, and the
   * shop never sees "3 colours made", only the panel disappearing from under them.
   */
  const nothingToOffer = !category || !sourceFront || targets.length === 0;
  if (nothingToOffer && doneCodes.length === 0 && failures.length === 0) return null;

  const sourceName = colorInfoFor(sourceCode)?.name || 'this colour';

  const stop = async () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    if (current?.code) {
      await api.post('/catalog-tryon/cancel-job', { jobId: current.code }).catch(() => {});
    }
    setRunning(false);
    setCurrent(null);
  };

  const run = async () => {
    // Taken once, here. `targets` shrinks as each colour gains its photographs, so counting
    // against it live read "1 of 2", then "2 of 1" -- a progress line going backwards.
    const queue = targets;
    setPlanned(queue.length);
    setRunning(true);
    setDoneCodes([]);
    setFailures([]);
    stoppedRef.current = false;

    for (const target of queue) {
      if (stoppedRef.current) break;

      const info = colorInfoFor(target.code) || {};
      const name = info.name || target.code;
      setCurrent({ code: target.code, name, status: `Making the ${name} one…` });

      const controller = new AbortController();
      abortRef.current = controller;
      const made = {};   // this colour's views, gathered as they arrive

      try {
        const payload = {
          modelId: pickRandomModelId(category),
          category,
          // Each colour is its own job. Sharing one name would have each colour cancel the
          // one before it, which is the whole reason a job name exists.
          jobId: target.code,
          saree: sourceFront,
          /*
           * Name AND hex together. The far end steers the picture with the name -- "Bottle
           * Green" lands far closer than "#0F5132" -- and keeps the hex only as a reference.
           * We hold both already, so there is no reason to send the weaker one alone.
           *
           * border and blouse are left off on purpose: a saree's border and its blouse piece
           * are usually a contrast colour the shop chose, and recolouring those along with
           * the body would turn a red saree with a gold border into a blue saree with a blue
           * border -- a garment the shop does not sell.
           */
          color: { name, hex: String(info.value || '').toLowerCase() || undefined }
        };

        const views = await streamCatalog({
          payload,
          signal: controller.signal,
          // Deliberately not wired to the far end's STATUS text. It reads "Starting AI
          // Generation Pipeline...", which replaced the one thing on screen worth knowing --
          // which colour is being made right now.
          /*
           * Saved as each one lands rather than at the end, so a colour that is stopped or
           * fails on its fourth view still keeps the three that arrived.
           *
           * Accumulated in `made` -- a plain object owned by this one colour's turn -- and
           * passed WHOLE every time. Two reasons it cannot be built from the stored state:
           * setPhotosFor merges shallowly, so `generatedViews` is replaced rather than added
           * to; and reading it back through photosFor returns whatever was captured when this
           * render happened, which is empty for all four callbacks. Doing that gave each
           * colour exactly one photograph -- whichever view finished last, quietly overwriting
           * the three before it.
           */
          onView: (view, image) => {
            made[view] = image;
            setPhotosFor(target.code, { generatedViews: { ...made } });
          }
        });

        if (Object.keys(views).length > 0) {
          setDoneCodes(prev => (prev.includes(target.code) ? prev : [...prev, target.code]));
        }
      } catch (err) {
        if (err?.name === 'AbortError' || stoppedRef.current) break;
        console.error(`Colour variant failed for ${name}:`, err);
        setFailures(prev => [...prev, { name, why: plainGenerationError(err) }]);
      } finally {
        abortRef.current = null;
      }
    }

    setCurrent(null);
    setRunning(false);
  };

  const box = {
    border: '1px solid var(--border-light)', borderRadius: '12px',
    padding: '16px', marginTop: '20px', background: 'var(--bg-subtle, transparent)'
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Palette size={18} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
          The other colours, from this one
        </h3>
      </div>

      {targets.length > 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          We take the front view we made of the {sourceName} one and put the same piece in{' '}
          {targets.map(t => colorInfoFor(t.code)?.name || t.code).join(', ')}. The weave, the
          border, the blouse and the model stay as they are &mdash; only the colour of the cloth
          changes. You can still photograph any of them yourself instead.
        </p>
      )}

      {/* Only while there is something left to make. The panel itself stays on screen after
          the last colour so the result can be read, but offering "MAKE THE OTHER 0 COLOURS"
          is a button that does nothing. */}
      {!running && targets.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={run}
          style={{ padding: '10px 18px', borderRadius: '8px' }}>
          MAKE {targets.length === 1 ? 'THE OTHER COLOUR' : `THE OTHER ${targets.length} COLOURS`}
        </button>
      )}

      {running && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {current?.status || 'Starting…'}
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {doneCodes.length} of {planned} done. This takes about a minute each.
              </span>
            </p>
            <button type="button" className="btn" onClick={stop}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
              <StopCircle size={16} /> Stop
            </button>
          </div>
        </div>
      )}

      {doneCodes.length > 0 && !running && (
        <p style={{ fontSize: '13px', color: 'var(--success, #16A34A)', marginTop: '12px',
          display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={16} />
          {doneCodes.length === 1 ? 'One colour made.' : `${doneCodes.length} colours made.`}{' '}
          Look through them below &mdash; anything you do not like, photograph yourself instead.
        </p>
      )}

      {failures.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {failures.map((f, n) => (
            <p key={n} style={{ fontSize: '13px', color: '#B45309', margin: '4px 0',
              display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span><b>{f.name}</b> &mdash; {f.why}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
