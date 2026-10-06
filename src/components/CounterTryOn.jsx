import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shirt, Camera, Image as ImageIcon, Loader2, X, Download, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useVariants } from '../hooks/useVariants';
import { useImages } from '../hooks/useImages';

const MAX_EDGE = 1600;

/**
 * Re-encode whatever the camera produced into a plain JPEG the server can read.
 *
 * An iPhone hands back HEIC, which this screen used to refuse with an instruction to go and
 * change a camera setting -- a dead end with a customer standing at the counter. Safari can
 * decode HEIC even though it cannot send it, so drawing it once and reading it back as JPEG gets
 * the photograph through. It also shrinks a 12MP photograph to something that fits in a request,
 * which is the difference between a try-on and a failed upload on a shop's connection.
 *
 * Returns null when the browser genuinely cannot decode the file -- HEIC on Android, a renamed
 * file, a corrupt one -- so the caller can say something useful instead of sending nothing.
 */
async function toSendableJpeg(file) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  if (!bitmap) return null;

  const w = bitmap.width || bitmap.naturalWidth;
  const h = bitmap.height || bitmap.naturalHeight;
  if (!w || !h) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  try {
    const url = canvas.toDataURL('image/jpeg', 0.9);
    return url.startsWith('data:image/jpeg') ? url : null;
  } catch {
    return null; // a cross-origin taint should never happen here, but a blank screen would
  }
}

/**
 * Try-on at the counter, in two steps: which colour, then the photograph.
 *
 * A customer is standing in front of the salesperson holding a saree and asking the obvious
 * question. Until now the only answer this app had was the QR code beside this button: print it,
 * hand them the garment, hope they scan it, hope they have the app. That works for somebody
 * browsing alone; it is useless with a customer already at the counter.
 *
 * The colour is asked FIRST and asked plainly, because on a saree it is the whole question. The
 * indigo and the crimson are the same garment and a completely different decision, and showing
 * somebody the wrong one is worse than showing them nothing -- they believe it. Nothing is
 * preselected when there is a real choice, so the wrong colour cannot be used by default.
 *
 * The photograph is sent once, used once, and deleted by the server as soon as the picture is
 * made. It is never stored by this screen either: it lives in this component's memory until the
 * box is closed. Said on the screen, because taking a picture of a customer without saying what
 * happens to it is not a reasonable thing to do.
 */
export default function CounterTryOn({ product, onClose }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);

  /*
   * Fetched, not read off the product: the product endpoint carries images but NOT variants --
   * the Variants tab loads those separately. Reading product.variants left this silently empty,
   * so the picker never appeared and every try-on quietly used the cover photograph again.
   */
  const { data: variantRows, isLoading: loadingVariants } = useVariants(product.id);

  /*
   * The cover is fetched too, for the same reason the variants are: the single-product endpoint
   * returns a summary and no photographs at all, so `product.images` is undefined here. Reading
   * it left the tile for an unphotographed colour showing a grey "No photo" panel directly above
   * a caption promising the main photograph would be used -- the card contradicting itself.
   */
  const { data: imageRows } = useImages(product.id);
  /*
   * The SAME rule the server uses when no colour photo is sent (tryon-counter.routes.ts): the
   * primary COVER/GALLERY photo of ANY colour, else the first. Filtering out colour photos here
   * showed "No photo" on a tile while the server quietly dressed the customer in another colour's
   * photograph -- so the tile now shows exactly what will be worn.
   */
  const productPhotos = (Array.isArray(imageRows) ? imageRows : [])
    .filter(i => !i.imageType || i.imageType === 'COVER' || i.imageType === 'GALLERY');
  const cover = productPhotos.find(i => i.isPrimary)?.url ?? productPhotos[0]?.url ?? null;

  /*
   * EVERY colour is offered, not only the photographed ones.
   *
   * Filtering to variants with their own picture meant a shop that had photographed one colour
   * got no picker at all, and the salesperson had no way to say which one the customer was
   * holding. The ones with no photograph of their own are shown and labelled as such, so choosing
   * one is a decision rather than a surprise.
   */
  const variants = (variantRows?.data ?? []).map(v => ({
    id: v.id,
    name: [v.colorName, v.size].filter(Boolean).join(' · ') || v.variantCode,
    photo: v.photoUrl ?? null,
    thumb: v.photoUrl ?? cover,
  }));
  const needsChoice = variants.length > 1;

  const [chosenId, setChosenId] = useState(null);
  /*
   * The default cannot be worked out on the first render, because the variants have not arrived
   * yet -- a useState initialiser reading them always saw an empty list and left this null. The
   * same mistake once made the tag sheet offer to print nothing. It is settled here instead, once
   * the answer exists, and ONLY when there is no real choice to make.
   */
  useEffect(() => {
    if (chosenId) return;
    if (variants.length === 1) setChosenId(variants[0].id);
  }, [variants.length, chosenId]);

  const chosen = variants.find(v => v.id === chosenId) ?? null;
  const ready = !needsChoice || chosen !== null;

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      return toast.error('That photograph is very large. Take another one.');
    }
    setReading(true);
    try {
      const jpeg = await toSendableJpeg(file);
      if (!jpeg) {
        return toast.error('That photograph could not be read. Take another one with the camera.');
      }
      setPhoto(jpeg);
      setResult(null);
    } finally {
      setReading(false);
    }
  };

  const go = async () => {
    setBusy(true);
    try {
      // The garment photograph is checked against this product's own rows on the server, never
      // trusted from here -- otherwise this would be a way to have any shop pay to composite
      // any two pictures.
      const { data } = await api.post(`/tryon/${product.id}`, {
        photo, ...(chosen?.photo ? { imageUrl: chosen.photo } : {})
      });
      setResult(data.imageUrl);
    } catch (err) {
      toast.error(err?.message || 'That did not work. Try a clear, full-length photograph.');
    } finally {
      setBusy(false);
    }
  };

  const box = {
    width: '100%', aspectRatio: '3 / 4', maxHeight: '52vh', borderRadius: '12px',
    background: 'var(--bg-input)', display: 'grid', placeItems: 'center', overflow: 'hidden'
  };
  const note = { fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0' };

  const chosenLine = chosen ? (
    <p style={{ ...note, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {chosen.thumb ? (
        <img src={chosen.thumb} alt="" style={{ width: '22px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />
      ) : null}
      <span>Trying on <strong style={{ color: 'var(--text-primary)' }}>{chosen.name}</strong></span>
    </p>
  ) : null;

  return (
    createPortal(<div role="dialog" aria-modal="true" aria-label={`See ${product.title} on a customer`}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
        background: 'rgba(10,12,16,.55)', padding: '16px'
      }}>
      <div className="card" style={{ width: '100%', maxWidth: '430px', padding: '18px', maxHeight: '94vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shirt size={16} /> See it on the customer
          </h3>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {result ? (
          <>
            {chosenLine}
            <div style={box}><img src={result} alt={`${product.title}, on the customer`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
            <p style={note}>A picture made by a computer, to give an idea. The real thing may sit differently.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
              <button className="btn-secondary" onClick={() => { setResult(null); setPhoto(null); }}>Another photo</button>
              <a className="btn-primary" href={result} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', textDecoration: 'none' }}>
                <Download size={15} /> Open it
              </a>
            </div>
          </>
        ) : photo ? (
          <>
            {chosenLine}
            <div style={box}><img src={photo} alt="The photograph you took" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
              <button className="btn-secondary" disabled={busy} onClick={() => setPhoto(null)}>Retake</button>
              <button className="btn-primary" disabled={busy} onClick={go}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {busy ? <><Loader2 size={15} className="animate-spin" /> Putting it on…</> : 'See it on them'}
              </button>
            </div>
            {busy ? <p style={{ ...note, textAlign: 'center' }}>This takes a few seconds.</p> : null}
          </>
        ) : !ready ? (
          /* STEP ONE -- which colour is in the customer's hands. */
          <>
            <p style={{ fontSize: '13px', margin: '0 0 4px', fontWeight: 500 }}>Which one are they holding?</p>
            <p style={{ ...note, margin: '0 0 12px' }}>
              Pick the colour first — the picture is made from that colour's photograph.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
              gap: '8px', maxHeight: '46vh', overflowY: 'auto'
            }}>
              {variants.map(v => (
                <button key={v.id} type="button" onClick={() => setChosenId(v.id)}
                  title={v.name}
                  style={{
                    padding: '4px', cursor: 'pointer', background: 'transparent',
                    borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-light)'
                  }}>
                  {v.thumb ? (
                    <img src={v.thumb} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '5px', display: 'block' }} />
                  ) : (
                    <span style={{
                      display: 'grid', placeItems: 'center', width: '100%', aspectRatio: '3/4',
                      borderRadius: '5px', background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '10px'
                    }}>No photo</span>
                  )}
                  <span style={{
                    display: 'block', fontSize: '10px', marginTop: '4px', color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{v.name}</span>
                  {/*
                    * Said out loud, because a colour with no photograph of its own is tried on
                    * using the product's main picture -- so the customer would be looking at a
                    * garment in the wrong colour and believing it.
                    */}
                  {!v.photo && (
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>
                      main photo
                    </span>
                  )}
                </button>
              ))}
            </div>
            {loadingVariants && !variants.length ? <p style={note}>Loading the colours…</p> : null}
          </>
        ) : (
          /* STEP TWO -- the photograph of the customer. */
          <>
            {needsChoice ? (
              <button type="button" onClick={() => setChosenId(null)}
                style={{
                  background: 'transparent', border: 0, padding: 0, marginBottom: '10px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                <ChevronLeft size={13} /> Change colour
              </button>
            ) : null}
            {chosenLine}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Take a full-length photograph of the customer, straight on, with a plain background if
              you can. It is used once to make the picture and then deleted — nothing is kept.
            </p>
            <button className="btn-primary" disabled={reading} onClick={() => cameraRef.current?.click()}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {reading ? <><Loader2 size={15} className="animate-spin" /> Reading the photo…</> : <><Camera size={16} /> Take a photograph</>}
            </button>
            {/*
              * A second way in, because `capture` takes the gallery away.
              *
              * On Android an input with `capture` opens the camera and offers nothing else, so a
              * salesperson who already photographed the customer a minute ago had no way to use
              * it. Two inputs -- one with `capture`, one without -- is the only way to offer both.
              */}
            <button className="btn-secondary" disabled={reading} onClick={() => galleryRef.current?.click()}
              style={{ width: '100%', marginTop: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ImageIcon size={15} /> Choose a photo
            </button>
          </>
        )}

        {/*
          * accept="image/*" rather than a list of three types: an iPhone camera produces HEIC,
          * and naming only jpeg/png/webp made iOS grey the photograph out. It is re-encoded to
          * JPEG before it is sent, so what the server receives is the same either way.
          *
          * `capture` opens the camera on a phone or tablet, which is where a salesperson is
          * standing. On a laptop it is ignored and a file chooser opens, which is right.
          */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment"
          onChange={pick} style={{ display: 'none' }} aria-label="Photograph of the customer" />
        <input ref={galleryRef} type="file" accept="image/*"
          onChange={pick} style={{ display: 'none' }} aria-label="Choose a photograph of the customer" />
      </div>
    </div>, document.body)
  );
}
