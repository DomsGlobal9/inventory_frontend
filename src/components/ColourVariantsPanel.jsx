import React, { useEffect, useMemo, useRef } from 'react';
import { Palette, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveTryOnCategory } from '../lib/catalogGeneration';
import { usePhotoJobs, useStartPhotoJobs, useCancelPhotoJob } from '../hooks/usePhotoJobs';
import PhotoJobOutcome from './PhotoJobOutcome';

/**
 * The other colours, on a product that is already published.
 *
 * The wizard offers this while a product is being added, which covers the common case. It does
 * not cover the two that come later and were the whole reason to ask: a colour added to a
 * product months after it went online, and a colour the shop looked at afterwards and did not
 * like. Both left them with the upload box and nothing else -- so the feature existed only
 * during the one minute they were first typing the product in.
 *
 * What it does: takes the front view of a colour that has one, and puts the same piece in the
 * colours that have no photograph at all. The weave, the border, the blouse and the model stay
 * as they are; only the colour of the cloth changes.
 *
 * THE WORK IS NOT DONE HERE ANY MORE. This used to run the colours one after another in this
 * tab, each taking about a minute -- so four colours meant four minutes of somebody watching a
 * screen they could not leave, and leaving it threw away whatever was mid-flight after it had
 * been paid for. Now all of them are queued in one go and the server works down the list. The
 * shop can close the tab on the way to the counter.
 */
export default function ColourVariantsPanel({ productId, dressType, variants, images, onChanged }) {
  const category = useMemo(() => resolveTryOnCategory(dressType), [dressType]);

  const { data: jobs } = usePhotoJobs(productId);
  const start = useStartPhotoJobs(productId);
  const cancel = useCancelPhotoJob(productId);

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

  /** Colours being made right now, so they are not offered a second time. */
  const mine = useMemo(() => (jobs?.active ?? []).filter(j => j.kind === 'COLOUR'), [jobs]);
  const busy = useMemo(() => new Set(mine.map(j => j.colourName.toLowerCase())), [mine]);

  // Colours with no photograph at all. A colour that already has one is never touched, and one
  // already being made is not offered again -- the database would refuse it anyway, but being
  // refused for pressing a button the screen was still showing is not an explanation.
  const targets = useMemo(
    () => colours.filter(c => c.images.length === 0 && c.variantIds.length > 0 && !busy.has(c.name.toLowerCase())),
    [colours, busy]
  );

  /*
   * When a job of ours drops out of the active list it has finished, and the photographs it made
   * are in the database but not yet on this screen. Watching the IDS rather than a count: one
   * finishing as the next starts leaves the count unchanged.
   */
  const wasActive = useRef([]);
  useEffect(() => {
    const now = mine.map(j => j.id);
    if (wasActive.current.some(id => !now.includes(id))) onChanged?.();
    wasActive.current = now;
  }, [mine, onChanged]);

  const nothingToOffer = !category || !source || targets.length === 0;
  if (nothingToOffer && mine.length === 0 && !(jobs?.recent ?? []).some(j => j.kind === 'COLOUR')) return null;

  /** Stops the lot: the one being made and everything still queued behind it. */
  const stopAll = async () => {
    for (const j of mine) await cancel.mutateAsync(j.id).catch(() => {});
  };

  const run = async () => {
    const result = await start.mutateAsync({
      productId,
      kind: 'COLOUR',
      // All of them at once. The server runs one at a time for this shop, so the queue is the
      // order they were asked for rather than a race, and nothing here has to sit and wait.
      colours: targets.map(t => t.name)
    });
    if (result?.made?.length) {
      toast.success(result.made.length === 1
        ? 'We are making it. You can carry on -- we will tell you when it is ready.'
        : `We are making ${result.made.length} colours. You can carry on -- we will tell you when they are ready.`);
    }
  };

  const running = mine.find(j => j.status === 'RUNNING') ?? mine[0] ?? null;

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

      {targets.length > 0 && source && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          We take the front view of the {source.colour.name} one and put the same piece in{' '}
          <b>{targets.map(t => t.name).join(', ')}</b>. The weave, the border, the blouse and the
          model stay as they are &mdash; only the colour of the cloth changes. Photograph any of
          them yourself instead if you would rather.
        </p>
      )}

      {mine.length === 0 && targets.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={run} disabled={start.isPending}
          style={{ padding: '9px 16px', borderRadius: '8px' }}>
          {start.isPending
            ? 'STARTING…'
            : `MAKE ${targets.length === 1 ? 'THIS COLOUR' : `THESE ${targets.length} COLOURS`}`}
        </button>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {running.status === 'QUEUED'
              ? `The ${running.colourName} one is next in line…`
              : `Making the ${running.colourName} one…`}
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {mine.length > 1 ? `${mine.length} still to do. ` : ''}
              <b>You can leave this page</b> &mdash; we will tell you when they are ready.
            </span>
          </p>
          <button type="button" className="btn" onClick={stopAll} disabled={cancel.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
            <StopCircle size={16} /> Stop
          </button>
        </div>
      )}

      <PhotoJobOutcome
        jobs={jobs?.recent}
        kind="COLOUR"
        doneText={(made) => `Made: ${made.map(j => j.colourName).join(', ')}.`}
      />
    </div>
  );
}
