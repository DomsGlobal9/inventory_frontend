import React, { useState, useMemo, useEffect, useRef } from "react";
import { isImageFile, imageFilesFrom } from '../utils/imageFile';
import { useIsTouchDevice } from '../hooks/useIsTouchDevice';
import { AlertCircle, CheckCircle, X, Image as ImageIcon, Eye, Camera } from "lucide-react";
import { useProduct } from "../context/ProductContext";
import ImageLightbox from "./ImageLightbox";
import { resolveTryOnCategory } from '../lib/photoSets';

/**
 * A grid of photographs with one box on the end that adds more.
 *
 * Written once and used twice -- by the plain upload path and by the extra photographs on
 * the AI path -- because the two were drifting: one took several files at a time and offered
 * a camera, the other took one file and did not.
 *
 * What the box has to get right:
 *   - SEVERAL at once. Somebody photographing a saree takes six pictures, not one six times.
 *   - The camera, on a phone. `capture` is ignored by desktop browsers, so offering it on a
 *     laptop would be a second button that silently behaves like the first one.
 *   - Tapping anywhere on the box opens the gallery, while the two buttons inside still do
 *     their own thing -- which is why this is a div with labels inside rather than one big
 *     <label>, whose picker would swallow any tap nested in it.
 */
function PhotoGrid({ photos, previews, onAdd, onRemove, onView, isTouch, disabled, addLabel, hint }) {
  const galleryRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const inputStyle = { display: 'none' };
  const button = {
    cursor: disabled ? 'not-allowed' : 'pointer', padding: '9px 14px', fontSize: '12px',
    display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: disabled ? 0.5 : 1
  };

  return (
    <div
      className="mobile-2-col-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap: '16px' }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled && e.dataTransfer.files?.length) onAdd(e.dataTransfer.files); }}
    >
      {photos.map((file, i) => (
        <div key={i} className="glass-panel" style={{ position: 'relative', height: '160px', overflow: 'hidden', borderRadius: '12px' }}>
          <img src={previews[i]} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* A flex row, not two right offsets: the tap-target rule in index.css grows an icon
              button to 44px on a touch device, and two circles placed 32px apart then overlap
              -- on phones only, which is exactly where they are tapped with a thumb. */}
          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => onView?.(previews[i])} title="View full size"
              style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <Eye size={14} />
            </button>
            <button type="button" onClick={() => onRemove(i)} title="Remove this photo"
              style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      <div
        className="glass-panel"
        onClick={() => { if (!disabled) galleryRef.current?.click(); }}
        style={{
          height: '160px', borderRadius: '12px',
          border: dragOver ? '2px solid var(--accent-gold)' : '1px dashed var(--border-focus)',
          backgroundColor: dragOver ? 'rgba(212, 175, 55, 0.08)' : undefined,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center', padding: '14px', gap: '8px',
          transition: 'border-color 0.15s, background-color 0.15s'
        }}
      >
        <ImageIcon size={24} color="var(--text-secondary)" />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {photos.length === 0 ? addLabel : 'Add more'}
          {hint && photos.length === 0 && (
            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{hint}</span>
          )}
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <label className="btn-secondary" onClick={(e) => e.stopPropagation()} style={button}>
            CHOOSE
            <input ref={galleryRef} type="file" accept="image/*" multiple style={inputStyle} disabled={disabled}
              onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ''; }} />
          </label>

          {isTouch && (
            /* "environment" is the rear camera: somebody photographing a garment points the
               phone at it, not at themselves. No `multiple` -- a camera takes one picture at
               a time, and asking for several only confuses the phone's picker. */
            <label className="btn-secondary" onClick={(e) => e.stopPropagation()} style={button}>
              <Camera size={14} /> CAMERA
              <input type="file" accept="image/*" capture="environment" style={inputStyle} disabled={disabled}
                onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Photographs for ONE colour.
 *
 * This used to hold the photographs for the whole product: one flat-lay, one set of
 * generated views, shown for every colour the shop sold. `colorCode` is now the colour
 * being photographed ("red_#FF0000"), and everything this component saves is saved under
 * it. The parent gives it a `key={colorCode}` so switching colour starts this component
 * again cleanly rather than carrying the previous colour's slots across.
 *
 * `colorCode` is optional. A product with no colours at all (a one-off, an alteration
 * service) still gets one plain set of photographs, saved under the empty key -- there is
 * no version of this screen that refuses to take a photograph.
 */
export default function GarmentPhotoshootUploader({ colorCode = '', colorLabel }) {
  const { productData, photosFor, setPhotosFor } = useProduct();
  const mine = photosFor(colorCode);

  /*
   * Restored from the wizard rather than started empty.
   *
   * These slots used to live only in this component, which had two consequences. Coming
   * back through "Back to Edit" showed empty slots even though the files were still held
   * in productData, and -- because the component starts blank on every mount -- an effect
   * that wrote this state out would have wiped them. That is the remount problem the guard
   * on the plain-photo effect below was added to dodge.
   *
   * Reading them back fixes both: the slots show what you chose, and writing them out
   * afterwards is then safe because there is nothing blank to overwrite them with.
   */
  const [files, setFiles] = useState(() => {
    const empty = { "full-dress": null, "top-front": null, "top-back": null, bottom: null };
    const stored = mine.sourceFiles;
    // The plain path stores an array; only the slot map belongs here.
    if (!stored || Array.isArray(stored) || typeof stored !== 'object') return empty;
    const restored = { ...empty };
    for (const [key, value] of Object.entries(stored)) {
      if (value instanceof File) restored[key] = value;
    }
    return restored;
  });
  const [previews, setPreviews] = useState({});
  const [uploadedStates, setUploadedStates] = useState({});
  const [uploading, setUploading] = useState({});
  const [dragOverKey, setDragOverKey] = useState(null);

  const isSaree = productData.dressType?.toLowerCase() === 'saree';
  const tryOnCategory = useMemo(() => resolveTryOnCategory(productData.dressType), [productData.dressType]);
  const tryOnEligible = tryOnCategory !== null;

  // Plain multi-photo upload for dress types the Try-On API doesn't support at all --
  // no fixed slots, no generation, these just become the product's gallery photos.
  //
  // Read back from the colour's saved set, like the slot map above. Switching colour and
  // switching back remounts this component, and starting at [] meant the effect below
  // immediately wrote that empty list over photographs the shop had already chosen.
  const [plainPhotos, setPlainPhotos] = useState(() =>
    Array.isArray(mine.sourceFiles) ? mine.sourceFiles.filter(f => f instanceof File) : []);
  const [plainPreviews, setPlainPreviews] = useState([]);

  const fields = useMemo(() => {
    if (isSaree) {
      return [
        { key: "saree", label: "Saree", hint: "Full drape (required)", required: true },
        { key: "blouse", label: "Blouse", hint: "Blouse piece (optional)", required: false },
      ];
    }
    return [
      { key: "full-dress", label: "Full Dress", hint: "Complete outfit (required)", required: true },
      { key: "top", label: "Top", hint: "Top/Kurti/Shirt (required)", required: true },
      { key: "bottom", label: "Bottom", hint: "Bottom/Trouser/Skirt (required)", required: true },
    ];
  }, [isSaree]);

  // Offer a camera only where there is one to offer -- see hooks/useIsTouchDevice.
  const isTouch = useIsTouchDevice();

  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  /**
   * Whether this colour is to be photographed on a model once the product is published.
   *
   * A CHOICE now, not an action. This step used to hold the stream open itself: press Generate
   * and wait the better part of a minute, watching a progress bar, on a screen you could not
   * leave -- and a shop adding a saree in five colours waited five times. The work now happens
   * on the server, and the only thing the wizard needs from the shop is whether they want it.
   *
   * Kept per colour in the wizard's own draft, so it survives a refresh like everything else
   * here, and read again by ProductPreview once the product and its variants really exist.
   */
  const wantViews = mine.wantViews === true;

  /*
   * There is no longer anything to abort on the way out.
   *
   * This used to hold an AbortController and tell the far end to cancel if the shop navigated
   * away mid-stream, because leaving would otherwise have left a job burning the quota with
   * nobody to receive it. Nothing starts here now, so leaving costs nothing -- which is the
   * entire point of the change.
   */

  useEffect(() => {
    const newPreviews = {};
    for (const [key, file] of Object.entries(files)) {
      if (file) newPreviews[key] = URL.createObjectURL(file);
    }
    setPreviews(newPreviews);
    return () => {
      for (const url of Object.values(newPreviews)) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
    };
  }, [files]);

  useEffect(() => {
    const urls = plainPhotos.map((f) => URL.createObjectURL(f));
    setPlainPreviews(urls);
    // This effect runs on every mount regardless of which branch below actually
    // renders (hooks can't be conditional) -- without the eligibility guard it wiped
    // out the AI-eligible path's slot uploads (real flat-lay photographs, set by
    // startGeneration's COMPLETE handler) back to [] the moment the component
    // remounted, e.g. after "Back to Edit" and returning without regenerating.
    if (!tryOnEligible) setPhotosFor(colorCode, { sourceFiles: plainPhotos });
    return () => { urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plainPhotos, tryOnEligible]);

  /*
   * The slot uploads are photographs of the product whether or not anybody presses
   * Generate.
   *
   * They used to reach the wizard from one place only: the COMPLETE handler of the
   * generation job. So a shopkeeper who uploaded a saree, saw the slot say "Ready", and
   * went straight to Review met a preview with no picture in it, "At Least 1 Photo"
   * unticked, and a greyed-out Publish button -- with nothing on screen connecting any of
   * that to the Generate step they had skipped. The checklist and the button agreed with
   * each other, which is why it read as the app being broken rather than as a step being
   * missed.
   *
   * Publishing already handles this correctly: persistImages uploads these as this
   * COLOUR's photographs whether or not anything was generated from them -- the shop's own
   * photograph is kept and shown alongside the generated views, never replaced by them.
   */
  useEffect(() => {
    if (!tryOnEligible) return;
    setPhotosFor(colorCode, { sourceFiles: files });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, tryOnEligible]);

  const addPlainPhotos = (fileList) => {
    // NOT f.type.startsWith('image/'): a camera capture on iOS arrives as
    // application/octet-stream or with no type at all, and this box silently dropped it.
    const imagesOnly = imageFilesFrom(fileList);
    if (imagesOnly.length === 0) return;
    setPlainPhotos((prev) => [...prev, ...imagesOnly]);
  };

  const removePlainPhoto = (index) => {
    setPlainPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /*
   * The shop's OWN photographs of this colour, on top of the flat-lay.
   *
   * The AI path had two fixed slots and nothing else, so a shop with a good photograph of
   * the drape, the border or the pallu had nowhere to put it -- the only way in was the
   * flat-lay slot, which is the picture the model shots get generated FROM. These are
   * ordinary photographs: as many as they like, in one go, from the gallery or the camera,
   * and they are shown in the shop alongside the generated views rather than instead of them.
   */
  const [extraPhotos, setExtraPhotos] = useState(() =>
    Array.isArray(mine.extraFiles) ? mine.extraFiles.filter(f => f instanceof File) : []);
  const [extraPreviews, setExtraPreviews] = useState([]);

  useEffect(() => {
    const urls = extraPhotos.map(f => URL.createObjectURL(f));
    setExtraPreviews(urls);
    if (tryOnEligible) setPhotosFor(colorCode, { extraFiles: extraPhotos });
    return () => { urls.forEach(u => { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPhotos, tryOnEligible]);

  const addExtraPhotos = (fileList) => {
    // imageFilesFrom, not type.startsWith('image/'): an iOS camera capture arrives as
    // application/octet-stream or with no type at all and would be dropped silently.
    const imagesOnly = imageFilesFrom(fileList);
    if (imagesOnly.length === 0) return;
    setExtraPhotos(prev => [...prev, ...imagesOnly]);
  };
  const removeExtraPhoto = (index) => setExtraPhotos(prev => prev.filter((_, i) => i !== index));

  // Paste an image (Ctrl/Cmd+V) anywhere on this step. In AI-eligible mode it lands in
  // the first still-empty named slot; in plain mode it's just appended to the list.
  // Re-registered whenever the relevant state changes so the handler never sees a
  // stale closure.
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;

      if (!tryOnEligible) {
        e.preventDefault();
        addPlainPhotos([file]);
        return;
      }

      e.preventDefault();
      const firstEmpty = fields.find((f) => !files[f.key]);
      // Slots first, then the shop's own photographs. Pasting used to do nothing once both
      // slots were filled, which reads as the paste having failed rather than as there being
      // nowhere left to put it.
      if (firstEmpty) handleFileChange(firstEmpty.key, file);
      else addExtraPhotos([file]);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, fields, tryOnEligible]);

  const handleFileChange = (key, file) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
    setError(null);
    setUploading((prev) => ({ ...prev, [key]: true }));
    
    setTimeout(() => {
      setUploading((prev) => ({ ...prev, [key]: false }));
      setUploadedStates((prev) => ({ ...prev, [key]: true }));
    }, 800);
  };

  const clearField = (key) => {
    setFiles((prev) => ({ ...prev, [key]: null }));
    setUploadedStates((prev) => ({ ...prev, [key]: false }));
  };

  /**
   * Ask for the four catalog views, or change your mind.
   *
   * It records a wish; it does not start anything. buildPayload, startGeneration and
   * stopGeneration used to live here -- the stream was opened from this component and every
   * view was saved into wizard state as a data URL, which is why the shop had to sit and watch
   * a progress bar for the better part of a minute per colour, on a screen they could not
   * leave. A shop adding a saree in five colours waited five times.
   *
   * The generation happens on the server now, and it can only start once the product and its
   * variants really exist -- a job has to be attached to something. That moment is publishing,
   * so ProductPreview reads this and starts the work the instant the product is created. Until
   * then this is one boolean in the wizard's own draft, saved and restored like everything else
   * on this screen.
   */
  const toggleViews = () => {
    if (!wantViews) {
      const missing = fields.find(f => f.required && !files[f.key]);
      if (missing) {
        // The views are made FROM this photograph. Accepting the request without it would mean
        // failing quietly a screen later, when nobody is looking at this step any more.
        setError(`Add the ${missing.label} photo first -- that is the picture the views are made from.`);
        return;
      }
    }
    setError(null);
    setPhotosFor(colorCode, { wantViews: !wantViews });
  };

  // The Try-On API only has models for Saree/Lehanga/Anarkali/Kurti/Sharara. For every
  // other dress type there's nothing to generate against, so skip the AI flow entirely
  // -- just let the user upload their own product photos, which become the gallery.
  if (!tryOnEligible) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {colorLabel ? `Photos of the ${colorLabel} one` : 'Product Photos'}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {productData.dressType
              ? `AI catalog generation isn't available for "${productData.dressType}" -- upload your own product photos instead.`
              : 'Upload your product photos.'}
          </p>
        </div>

        <PhotoGrid
          photos={plainPhotos}
          previews={plainPreviews}
          onAdd={addPlainPhotos}
          onRemove={removePlainPhoto}
          onView={setLightboxSrc}
          isTouch={isTouch}
          addLabel="Add photos"
          hint="Several at once is fine"
        />

        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {colorLabel ? `Photos of the ${colorLabel} one` : 'Catalog Draping AI'}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Lay the garment out flat and photograph it. We make four model shots from that one photo, and
          keep your own photo alongside them.
        </p>
      </div>

      {/* Upload slots */}
      <div className="mobile-2-col-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: '16px' }}>
        {fields.map(({ key, label, hint, required }) => {
          const file = files[key];
          const preview = previews[key];
          const isUploading = uploading[key];
          /*
           * "Ready" follows the FILE, not the little flag the upload animation sets.
           *
           * uploadedStates is local to this component and starts empty on every mount, so
           * after switching colour and switching back the slot showed its preview picture
           * with no Ready on it -- the colour card next to it said "1 photo" at the same
           * time. The file being there IS ready; the flag only drives the brief spinner.
           */
          const uploaded = !!file || uploadedStates[key];
          const isDragTarget = dragOverKey === key;

          const borderStyle = isDragTarget
            ? '2px solid var(--accent-gold)'
            : required
              ? '1px dashed var(--accent-gold)'
              : '1px dashed var(--border-focus)';

          return (
            <div
              key={key}
              className="glass-panel"
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
              onDragLeave={() => setDragOverKey((prev) => (prev === key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped && isImageFile(dropped)) handleFileChange(key, dropped);
              }}
              style={{
                border: borderStyle,
                padding: file ? '0' : '16px',
                height: '160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                backgroundColor: isDragTarget ? 'rgba(212, 175, 55, 0.08)' : undefined
              }}
            >
              {!file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <ImageIcon size={32} color="var(--text-secondary)" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {label} {required && <span style={{ color: 'var(--accent-gold)' }}>*</span>}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{hint}</p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <label className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '12px' }}>
                      UPLOAD
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (f) handleFileChange(key, f);
                        }}
                        disabled={isUploading}
                      />
                    </label>

                    {/*
                      Only where there is a camera to open. `capture` is ignored by desktop
                      browsers, so on a laptop this button would silently be a second, worse
                      copy of UPLOAD -- two buttons doing the same thing, one of them lying
                      about what it does. useIsTouchDevice asks about the input device rather
                      than the window width, so a narrow laptop window does not grow a camera
                      and a docked tablet loses one.

                      "environment" is the rear camera: somebody photographing a garment is
                      pointing the phone at it, not at themselves.
                    */}
                    {isTouch && (
                      <label
                        className="btn-secondary"
                        style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Camera size={14} />
                        CAMERA
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            // No isImageFile guard: the file came from the camera, and on iOS
                            // it arrives with no usable type. Rejecting it here is the bug
                            // that guard exists to avoid.
                            if (f) handleFileChange(key, f);
                          }}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {preview && (
                    <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}

                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => clearField(key)}
                      disabled={isUploading}
                      style={{
                        padding: '6px',
                        backgroundColor: 'rgba(255, 0, 0, 0.8)',
                        color: 'white',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 500, color: 'white' }}>{label}</h3>
                    {isUploading ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Uploading…</span>
                    ) : uploaded ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle color="#10B981" size={14} />
                        <span style={{ fontSize: '12px', color: '#10B981' }}>Ready</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/*
        Their own photographs of this colour, as many as they like.

        Deliberately BELOW the flat-lay slots and above Generate, because that is the order
        the work happens in: photograph the garment flat, add whatever else you took, then
        generate. Nothing here is required and nothing here is sent to the generator -- these
        are simply shown in the shop next to the model shots.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {colorLabel ? `Your own photos of the ${colorLabel} one` : 'Your own photos'}
            {' '}<span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>Optional</span>
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            The drape, the border, the pallu, a close-up of the weave — anything you want shoppers to see.
            These are shown in your shop alongside the generated views.
          </p>
        </div>
        <PhotoGrid
          photos={extraPhotos}
          previews={extraPreviews}
          onAdd={addExtraPhotos}
          onRemove={removeExtraPhoto}
          onView={setLightboxSrc}
          isTouch={isTouch}
          addLabel="Add photos"
          hint="Several at once is fine"
        />
      </div>

      {/*
        A line to tick, not a button that runs for a minute.

        What stood here was GENERATE 4-VIEW CATALOG, a Stop button, a progress bar with a fake
        creep on it to stop the real milestones reading as stuck, and a gallery of the four views
        once they landed. All of it existed because the work happened in this tab. It does not any
        more, so the only thing left to ask is whether they want it -- and the answer is acted on
        after publishing, when there is a product for the photographs to belong to.

        The shop does not see the views before publishing now. They arrive about a minute later,
        wherever the shop happens to be, and can be made again from the product's Images tab if
        they are not liked. That is the trade: a minute of waiting, per colour, for a set of
        photographs nobody was going to reject anyway.
      */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '32px' }}>
        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer',
            padding: '16px', borderRadius: '12px',
            border: `1px solid ${wantViews ? 'var(--accent-gold)' : 'var(--border-light)'}`,
            background: wantViews ? 'var(--bg-hover)' : 'transparent'
          }}
        >
          <input
            type="checkbox"
            checked={wantViews}
            onChange={toggleViews}
            style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, cursor: 'pointer' }}
          />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <ImageIcon size={16} style={{ color: 'var(--accent-gold)' }} />
              Make the four catalog views{colorLabel ? ` for the ${colorLabel} one` : ''}
            </span>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.55 }}>
              Front, left, right and back, on a model, made from the photograph above. We start
              the moment you publish and tell you when they are ready &mdash;{' '}
              <b>you do not have to wait here.</b> Your own photograph stays exactly where it is.
            </span>
            {wantViews && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--success, #16A34A)', marginTop: '8px' }}>
                <CheckCircle size={14} /> We will make these as soon as you publish.
              </span>
            )}
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle color="#EF4444" size={20} />
          <p style={{ color: '#FCA5A5', fontSize: '14px' }}>{error}</p>
        </div>
      )}
    </div>
  );
}
