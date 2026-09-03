import React, { useState, useMemo, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, X, Image as ImageIcon, StopCircle, Eye } from "lucide-react";
import { useProduct } from "../context/ProductContext";
import { api } from "../lib/api";
import ImageLightbox from "./ImageLightbox";

const VIEW_ORDER = ["front", "left", "right", "back"];
const VIEW_LABELS = {
  front: "Front",
  left: "Sitting",
  right: "Right",
  back: "Back",
};

// The Try-On API's view names don't match our internal keys/labels 1:1.
const API_VIEW_TO_LOCAL = { front: "front", sitting: "left", side: "right", back: "back" };

// The Try-On API only supports these 5 garment families. Anything else (menswear,
// kids' sets, western wear, "Wedding"/"Salwar Suit Sets" and similar catch-alls) has
// no matching model and must never be offered AI generation -- silently defaulting
// those to KURTI (the old behavior) produced nonsense results for unrelated garments.
function resolveTryOnCategory(dressType) {
  const dt = (dressType || "").toLowerCase();
  if (dt.includes("saree")) return "SAREE";
  if (dt.includes("anarkali")) return "ANARKALI";
  if (dt.includes("lehanga") || dt.includes("lehenga")) return "LEHANGA";
  if (dt.includes("sharara")) return "SHARARA";
  if (dt.includes("kurti") || dt.includes("kurta")) return "KURTI";
  return null; // no supported category -- caller must fall back to plain upload
}

// There are exactly 4 standardized models per category (per the Try-On API docs)
// and no per-model preview imagery is exposed, so we can't offer a real picker --
// pick one at random on every generation instead.
function pickRandomModelId(category) {
  const index = Math.floor(Math.random() * 4) + 1;
  return `${category.toLowerCase()}${index}`;
}

// Phone-camera photos routinely run 8-15MB; sent 2-3 at a time as base64 (+33%
// overhead) that blew straight through the backend's payload limit. Downscaling to a
// generous max dimension and re-encoding as JPEG keeps each image in the low hundreds
// of KB -- more than enough detail for the Try-On model, and avoids needing an
// ever-larger server-side limit to chase real-world photo sizes.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// The Try-On API occasionally returns a single "view" as a multi-pose contact sheet
// (several near-identical renders side by side on one continuous backdrop) instead of
// one clean photo. A normal full-body product shot is portrait (taller than wide); a
// panel composite is landscape, roughly N times wider than a single panel. When we
// see that shape, assume N equal panels and keep only the first one.
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load generated image'));
    img.src = dataUrl;
  });
}

async function keepFirstPoseOnly(dataUrl) {
  try {
    const img = await loadImage(dataUrl);
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio <= 1.15) return dataUrl; // normal portrait shot, nothing to crop

    const panelCount = Math.round(ratio / 0.75) || 1; // ~0.75 = typical single-pose portrait ratio
    if (panelCount <= 1) return dataUrl;

    const panelWidth = Math.floor(img.naturalWidth / panelCount);
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, panelWidth, img.naturalHeight, 0, 0, panelWidth, img.naturalHeight);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return dataUrl; // if anything goes wrong, fall back to the original rather than losing the image
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load ${file.name} for compression`));
    };
    img.src = objectUrl;
  });
}

export default function GarmentPhotoshootUploader({ onGenerationComplete }) {
  const { productData, updateProductData } = useProduct();
  
  const [files, setFiles] = useState({
    "full-dress": null,
    "top-front": null,
    "top-back": null,
    bottom: null,
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
  const [plainPhotos, setPlainPhotos] = useState([]);
  const [plainPreviews, setPlainPreviews] = useState([]);
  const [plainDragOver, setPlainDragOver] = useState(false);

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

  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(null);
  const [status, setStatus] = useState(null);
  const [views, setViews] = useState(productData.generatedGarmentViews || {});
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const abortControllerRef = useRef(null);

  // Stop a generation still in flight if the user navigates away mid-stream, so we
  // don't leave a zombie job burning the Gateway quota.
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        api.post('/catalog-tryon/cancel-job').catch(() => {});
      }
    };
  }, []);

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
    // out the AI-eligible path's sourceUploadFiles (real flat-lay uploads, set by
    // startGeneration's COMPLETE handler) back to [] the moment the component
    // remounted, e.g. after "Back to Edit" and returning without regenerating.
    if (!tryOnEligible) updateProductData('sourceUploadFiles', plainPhotos);
    return () => { urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* ignore */ } }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plainPhotos, tryOnEligible]);

  const addPlainPhotos = (fileList) => {
    const imagesOnly = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imagesOnly.length === 0) return;
    setPlainPhotos((prev) => [...prev, ...imagesOnly]);
  };

  const removePlainPhoto = (index) => {
    setPlainPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Paste an image (Ctrl/Cmd+V) anywhere on this step. In AI-eligible mode it lands in
  // the first still-empty named slot; in plain mode it's just appended to the list.
  // Re-registered whenever the relevant state changes so the handler never sees a
  // stale closure.
  useEffect(() => {
    const onPaste = (e) => {
      if (generating) return;
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

      const firstEmpty = fields.find((f) => !files[f.key]);
      if (!firstEmpty) return;
      e.preventDefault();
      handleFileChange(firstEmpty.key, file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [files, fields, generating, tryOnEligible]);

  // The real milestones only move 4 times across a 30-90s generation (once per view),
  // which reads as "stuck." Layer a slow creep on top that fills most of the gap to
  // the next milestone and resets every time a real one lands, so the bar is always
  // visibly moving without ever overtaking the actual progress.
  const milestonePercent = useMemo(() => {
    const idx = step ? VIEW_ORDER.indexOf(step) : -1;
    if (idx < 0) return generating ? 5 : 0;
    return Math.min(100, Math.round(((idx + 1) / VIEW_ORDER.length) * 100));
  }, [step, generating]);

  const [creep, setCreep] = useState(0);
  useEffect(() => {
    setCreep(0);
    if (!generating) return;
    const nextMilestone = milestonePercent >= 100 ? 100 : milestonePercent + (100 / VIEW_ORDER.length);
    const cap = (nextMilestone - milestonePercent) * 0.75;
    const interval = setInterval(() => {
      setCreep((prev) => Math.min(cap, prev + 1.2));
    }, 350);
    return () => clearInterval(interval);
  }, [generating, milestonePercent]);

  const progressPercent = generating
    ? Math.min(99, Math.round(milestonePercent + creep)) // never let the fake creep touch 100 before COMPLETE actually arrives
    : milestonePercent;

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

  const buildPayload = async () => {
    // Randomized fresh per generation call -- there are 4 equally-valid models per
    // category and no preview imagery to pick from, per the Try-On API docs.
    const base = { modelId: pickRandomModelId(tryOnCategory), category: tryOnCategory };

    if (isSaree) {
      base.saree = await fileToBase64(files.saree);
      if (files.blouse) base.blouse = await fileToBase64(files.blouse);
    } else {
      base.full = await fileToBase64(files["full-dress"]);
      base.top = await fileToBase64(files.top);
      base.bottom = await fileToBase64(files.bottom);
    }
    return base;
  };

  const stopGeneration = async () => {
    abortControllerRef.current?.abort();
    setGenerating(false);
    setStatus("Generation stopped.");
    try {
      await api.post('/catalog-tryon/cancel-job');
    } catch (err) {
      console.error('cancel-job failed:', err);
    }
  };

  const startGeneration = async () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !files[field.key]) {
        setError(`Please upload the ${field.label} image first.`);
        return;
      }
    }

    setGenerating(true);
    setStep(null);
    setStatus("Preparing generation...");
    setViews({});
    setError(null);

    const collected = {};
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const payload = await buildPayload();
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4006/api/v1';
      const response = await fetch(`${apiBase}/catalog-tryon/generate-catalog`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Generation failed to start (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop();

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          const data = JSON.parse(chunk.substring(6));

          if (data.type === 'STATUS') {
            setStatus(data.message);
          } else if (data.type === 'VIEW_READY') {
            const localKey = API_VIEW_TO_LOCAL[data.view] || data.view;
            const cleanImage = await keepFirstPoseOnly(data.image);
            collected[localKey] = cleanImage;
            setViews(prev => ({ ...prev, [localKey]: cleanImage }));
            setStep(localKey);
          } else if (data.type === 'COMPLETE') {
            setStatus('Generation complete.');
            setGenerating(false);

            updateProductData('generatedGarmentViews', collected);
            updateProductData('hasGeneratedGarment', true);
            updateProductData('imageUrls', VIEW_ORDER.map(v => collected[v]).filter(Boolean));
            // The original flat-lay uploads (files state, local to this component) --
            // ProductPreview needs these too, to persist them as RAW_UPLOAD images
            // alongside the generated views on publish.
            updateProductData('sourceUploadFiles', files);

            if (onGenerationComplete) onGenerationComplete();
          } else if (data.type === 'ERROR') {
            throw new Error(data.error || 'Generation failed');
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // user hit Stop -- already handled there
      console.error('Catalog generation failed:', err);
      setError(err.message || 'Generation failed. Please try again.');
      setGenerating(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  // The Try-On API only has models for Saree/Lehanga/Anarkali/Kurti/Sharara. For every
  // other dress type there's nothing to generate against, so skip the AI flow entirely
  // -- just let the user upload their own product photos, which become the gallery.
  if (!tryOnEligible) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Product Photos
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {productData.dressType
              ? `AI catalog generation isn't available for "${productData.dressType}" -- upload your own product photos instead.`
              : 'Upload your product photos.'}
          </p>
        </div>

        <div
          className="mobile-2-col-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}
          onDragOver={(e) => { e.preventDefault(); setPlainDragOver(true); }}
          onDragLeave={() => setPlainDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setPlainDragOver(false);
            if (e.dataTransfer.files?.length) addPlainPhotos(e.dataTransfer.files);
          }}
        >
          {plainPhotos.map((file, i) => (
            <div key={i} className="glass-panel" style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
              <img src={plainPreviews[i]} alt={`Product ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => setLightboxSrc(plainPreviews[i])}
                title="View full size"
                style={{
                  position: 'absolute', top: '8px', right: '40px',
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer'
                }}
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => removePlainPhoto(i)}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,0,0,0.8)', border: 'none', color: '#fff', cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <label
            className="glass-panel"
            style={{
              height: '160px',
              border: plainDragOver ? '2px solid var(--accent-gold)' : '1px dashed var(--border-focus)',
              backgroundColor: plainDragOver ? 'rgba(212, 175, 55, 0.08)' : undefined,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', textAlign: 'center', padding: '16px', gap: '8px'
            }}
          >
            <ImageIcon size={28} color="var(--text-secondary)" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {plainPhotos.length === 0 ? 'Add Photos' : 'Add More'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) addPlainPhotos(e.target.files); e.target.value = ''; }}
            />
          </label>
        </div>

        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Catalog Draping AI
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Upload your flat-lay garment images. The full-dress image is required for 4-pose model generation.
        </p>
      </div>

      {/* Upload slots */}
      <div className="mobile-2-col-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: '16px' }}>
        {fields.map(({ key, label, hint, required }) => {
          const file = files[key];
          const preview = previews[key];
          const isUploading = uploading[key];
          const uploaded = uploadedStates[key];
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
              onDragOver={(e) => { e.preventDefault(); if (!generating) setDragOverKey(key); }}
              onDragLeave={() => setDragOverKey((prev) => (prev === key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                if (generating) return;
                const dropped = e.dataTransfer.files?.[0];
                if (dropped && dropped.type.startsWith('image/')) handleFileChange(key, dropped);
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
                      disabled={generating || isUploading}
                    />
                  </label>
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
                      disabled={generating || isUploading}
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

      {/* Generate Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '32px' }}>
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '300px' }}>
          <button
            onClick={startGeneration}
            disabled={generating || fields.some(f => f.required && !files[f.key])}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}
          >
            {generating ? (
               <span>GENERATING CATALOG...</span>
            ) : (
              <>
                <ImageIcon size={18} />
                GENERATE 4-VIEW CATALOG
              </>
            )}
          </button>
          {generating && (
            <button
              onClick={stopGeneration}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}
              title="Stop Generation"
            >
              <StopCircle size={18} />
            </button>
          )}
        </div>
        {!generating && status && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px' }}>{status}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle color="#EF4444" size={20} />
          <p style={{ color: '#FCA5A5', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Progress loader */}
      {generating && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>AI Pipeline Active</p>
            <p style={{ fontSize: '12px', color: 'var(--accent-gold)' }}>{progressPercent}%</p>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: 'var(--accent-gold)', transition: 'width 0.3s ease' }} />
          </div>
          {status && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>{status}</p>
          )}
        </div>
      )}

      {/* Generated views */}
      {Object.keys(views).length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
             <h4 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)' }}>
               Generated Catalog Views
             </h4>
             <span style={{ fontSize: '12px', fontWeight: 500, color: '#10B981', padding: '4px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}>
               READY FOR PUBLISH
             </span>
          </div>
          
          <div className="mobile-2-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {VIEW_ORDER.map((viewKey) => {
              const url = views[viewKey];
              const displayLabel = VIEW_LABELS[viewKey] || viewKey;
              
              return (
                <div
                  key={viewKey}
                  className="glass-panel"
                  style={{ 
                    overflow: 'hidden',
                    border: url ? '1px solid var(--border-light)' : '1px dashed var(--border-focus)'
                  }}
                >
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {displayLabel}
                    </p>
                    {url && <CheckCircle size={14} color="var(--accent-gold)" />}
                  </div>
                  
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={`${displayLabel} view`}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => setLightboxSrc(url)}
                          title="View full size"
                          style={{
                            position: 'absolute', top: '8px', right: '8px',
                            width: '28px', height: '28px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 1
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </>
                    ) : (
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                         <ImageIcon size={24} />
                         <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending</span>
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
