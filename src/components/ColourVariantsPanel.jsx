import React, { useEffect, useMemo, useRef } from 'react';
import { Palette, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveTryOnCategory } from '../lib/catalogGeneration';
import { groupByColour, colourTargets, sourceForColours, viewsMadeFor, progressText } from '../lib/photoSets';
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
 * colours that cannot be photographed from anything of their own. The weave, the border, the
 * blouse and the model stay as they are; only the colour of the cloth changes.
 *
 * THE WORK IS NOT DONE HERE ANY MORE. This used to run the colours one after another in this
 * tab, each taking about a minute -- so four colours meant four minutes of somebody watching a
 * screen they could not leave, and leaving it threw away whatever was mid-flight after it had
 * been paid for. Now all of them are queued in one go and the server works down the list. The
 * shop can close the tab on the way to the counter.
 *
 * Which colours it offers is decided in lib/photoSets.js, shared with the views panel, so the
 * two cannot disagree about what still needs doing.
 */
export default function ColourVariantsPanel({ productId, dressType, variants, images, onChanged }) {
  const category = useMemo(() => resolveTryOnCategory(dressType), [dressType]);

  const { data: jobs } = usePhotoJobs(productId);
  const start = useStartPhotoJobs(productId);
  const cancel = useCancelPhotoJob(productId);

  const colours = useMemo(() => groupByColour(variants, images), [variants, images]);
  const source = useMemo(() => sourceForColours(colours), [colours]);

  /** Colours being made right now, so they are not offered a second time. */
  const mine = useMemo(() => (jobs?.active ?? []).filter(j => j.kind === 'COLOUR'), [jobs]);
  const busy = useMemo(() => new Set(mine.map(j => j.colourName.toLowerCase())), [mine]);

  // A colour already being made is not offered again -- the database would refuse it anyway, but
  // being refused for pressing a button the screen was still showing is not an explanation.
  const targets = useMemo(
    () => colourTargets(colours).filter(c => !busy.has(c.name.toLowerCase())),
    [colours, busy]
  );

  // Ones that were stopped or failed part-way, rather than never started. Worth naming: the shop
  // is looking at a photograph of that colour already and would otherwise wonder what we mean.
  const unfinished = useMemo(() => targets.filter(c => viewsMadeFor(c.images).size > 0), [targets]);

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
          The colours still waiting for photographs
        </h3>
      </div>

      {targets.length > 0 && source && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          We take the front view of the {source.colour.name} one and put the same piece in{' '}
          <b>{targets.map(t => t.name).join(', ')}</b>. The weave, the border, the blouse and the
          model stay as they are &mdash; only the colour of the cloth changes. Photograph any of
          them yourself instead if you would rather.
          {unfinished.length > 0 && (
            <>
              {' '}
              {/*
                Named rather than lumped in. A colour that stopped at 2 of 4 already has pictures
                on the screen below, and telling the shop it "has no photograph" reads as the app
                not knowing what it is looking at.
              */}
              <b>{unfinished.map(c => `${c.name} (${progressText(c)})`).join(', ')}</b>{' '}
              {unfinished.length === 1 ? 'was' : 'were'} stopped part-way; running again makes the
              whole set and replaces what is there, so they match.
            </>
          )}
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
