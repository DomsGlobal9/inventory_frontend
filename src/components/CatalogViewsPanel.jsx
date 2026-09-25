import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, StopCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImageFile } from '../services/image.service';
import { resolveTryOnCategory } from '../lib/catalogGeneration';
import {
  groupByColour, viewsCandidates, sourceForViews, viewsMadeFor, progressText
} from '../lib/photoSets';
import { usePhotoJobs, useStartPhotoJobs, useCancelPhotoJob } from '../hooks/usePhotoJobs';
import PhotoJobOutcome from './PhotoJobOutcome';

/**
 * The four catalog views, made from a photograph the shop already has.
 *
 * Until recently this only existed in the Add a product wizard, which meant it only existed
 * during the one minute somebody was first typing a product in. Everything afterwards -- a
 * photograph taken later, a product imported from a sheet, a colour added months on -- had the
 * upload box and nothing else. A shop with one good photograph of a saree could not turn it into
 * a set.
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
 *
 * THE WORK IS NOT DONE HERE ANY MORE. This used to hold the stream open and save every view
 * itself, so whoever pressed the button had to stay on this screen for the better part of a
 * minute -- and closing the tab threw the work away after it had already been paid for. Now it
 * asks the server for a job and watches a row. Press it and walk off; it is still made.
 *
 * Which colours it offers is decided in lib/photoSets.js, shared with the colours panel, so the
 * two cannot disagree about what still needs doing.
 */
export default function CatalogViewsPanel({ productId, dressType, variants, images, onChanged }) {
  const category = useMemo(() => resolveTryOnCategory(dressType), [dressType]);

  const { data: jobs } = usePhotoJobs(productId);
  const start = useStartPhotoJobs(productId);
  const cancel = useCancelPhotoJob(productId);

  const colours = useMemo(() => groupByColour(variants, images), [variants, images]);
  const candidates = useMemo(() => viewsCandidates(colours), [colours]);

  const [chosen, setChosen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const flatLayRef = useRef(null);

  /** Sets of views being made for this product right now. */
  const mine = useMemo(() => (jobs?.active ?? []).filter(j => j.kind === 'VIEWS'), [jobs]);

  // A colour being made is no longer a candidate -- it is already happening -- but it must still
  // be reachable, or its progress would have nowhere to show.
  const target = candidates.find(c => c.name === chosen)
    ?? colours.find(c => mine.some(j => j.colourName === c.name))
    ?? candidates[0]
    ?? null;

  const source = target ? sourceForViews(target) : null;
  const job = target ? mine.find(j => j.colourName === target.name) : null;

  // How far a half-made colour got. Nought for one that has never been run.
  const madeSoFar = target ? viewsMadeFor(target.images).size : 0;

  /*
   * When a job of ours drops out of the active list it has finished, and the photographs it made
   * are in the database but not yet on this screen.
   *
   * Watching the IDS rather than a count: one finishing as another starts leaves the count
   * unchanged, and the shop would be left looking at a gallery still missing the set they had
   * just watched being made.
   */
  const wasActive = useRef([]);
  useEffect(() => {
    const now = mine.map(j => j.id);
    if (wasActive.current.some(id => !now.includes(id))) onChanged?.();
    wasActive.current = now;
  }, [mine, onChanged]);

  const run = async (sourceImageId) => {
    if (!target) return;
    const result = await start.mutateAsync({
      productId,
      kind: 'VIEWS',
      colours: [target.name],
      ...(sourceImageId ? { sourceImageId } : {})
    });
    if (result?.made?.length) {
      toast.success('We are making them. You can carry on -- we will tell you when they are ready.');
    }
  };

  /*
   * The flat-lay path: a colour with no photograph at all.
   *
   * Uploaded as RAW_UPLOAD rather than GALLERY, which is what keeps it out of the shop -- the
   * gallery shows it dimmed and labelled NOT IN YOUR SHOP, with a way to publish it after all if
   * the shop decides they want it there. Then it starts straight away, because choosing a
   * flat-lay IS the instruction; making somebody press a second button afterwards would be
   * asking them to confirm something they already said.
   *
   * The UPLOAD still happens here, and should: the file is in this browser and nowhere else.
   * Only the generation moved.
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
       * backend wraps everything in { success, data } -- so reading straight off it gave
       * undefined, the generation decided it had no source and returned without a word. The
       * flat-lay uploaded, nothing was made, and nothing said why.
       */
      const image = saved?.data ?? saved;
      if (!image?.id) throw new Error('That picture was saved but could not be read back.');
      onChanged?.();
      // The id, not the URL: the job outlives this page, and the server looks the picture up
      // again when it gets to it.
      await run(image.id);
    } catch (err) {
      console.error('Flat-lay upload failed:', err);
      toast.error(err?.message || 'That picture could not be saved. Please try again.');
    } finally {
      setUploading(false);
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
          {madeSoFar > 0 ? 'Finish the catalog views' : 'Make the four catalog views'}
        </h3>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        {/*
          A colour that was stopped part-way is its own case, and saying so plainly is the whole
          point of it being offered again. Telling them "we take your photograph and make four
          views" when they are looking at two of those views already on the screen below reads as
          the app not knowing what it has.
        */}
        {madeSoFar > 0 ? (
          <>
            <b>{target.name}</b> stopped at {progressText(target)} views. Making them again gives
            you the whole set &mdash;{' '}
            {source?.generated
              ? 'we work from the front view it already has.'
              : 'we work from your own photograph again.'}{' '}
            The {madeSoFar === 1 ? 'one you have is' : `${madeSoFar} you have are`} replaced with
            the new set, so they all match.
          </>
        ) : source ? (
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

      {candidates.length > 1 && !job && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Which colour to photograph
          </label>
          <select className="input-field" value={target.name}
            onChange={(e) => setChosen(e.target.value)} style={{ maxWidth: '260px' }}>
            {candidates.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}{viewsMadeFor(c.images).size > 0 ? ` (${progressText(c)})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {!job && (
        <>
          <input ref={flatLayRef} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={chooseFlatLay} style={{ display: 'none' }} />
          <button type="button" className="btn btn-primary"
            onClick={() => (source ? run() : flatLayRef.current?.click())}
            disabled={uploading || start.isPending}
            style={{ padding: '9px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {source
              ? (start.isPending ? 'STARTING…' : (madeSoFar > 0 ? 'MAKE THE WHOLE SET' : 'MAKE THE FOUR VIEWS'))
              : <><Upload size={15} /> {uploading ? 'UPLOADING…' : 'CHOOSE A FLAT-LAY'}</>}
          </button>
        </>
      )}

      {job && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {/*
              Our words, not the far end's. It reports things like "Starting AI Generation
              Pipeline......", which is a sentence written for whoever built it -- a saree shop
              owner should not be reading about pipelines on their own product screen.
            */}
            {job.status === 'QUEUED'
              ? `The ${job.colourName} views are next in line…`
              : `Making the ${job.colourName} views…`}
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {job.viewsDone} of {job.viewsTotal} done. <b>You can leave this page</b> &mdash; we
              will tell you when they are ready.
            </span>
          </p>
          <button type="button" className="btn" onClick={() => cancel.mutate(job.id)}
            disabled={cancel.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
            <StopCircle size={16} /> Stop
          </button>
        </div>
      )}

      <PhotoJobOutcome
        jobs={jobs?.recent}
        kind="VIEWS"
        doneText={(made) => made.length === 1
          ? `${made[0].colourName} is done. The other colours can be made from it now.`
          : `Made: ${made.map(j => j.colourName).join(', ')}. The other colours can be made from these now.`}
      />
    </div>
  );
}
