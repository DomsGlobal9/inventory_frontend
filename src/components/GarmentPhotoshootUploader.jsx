import React, { useState, useMemo, useEffect } from "react";
import { AlertCircle, CheckCircle, X, Image as ImageIcon } from "lucide-react";
import { useProduct } from "../context/ProductContext";



const VIEW_ORDER = ["front", "left", "right", "back"];
const VIEW_LABELS = {
  front: "Front",
  left: "Sitting",
  right: "Right",
  back: "Back",
};

const AVAILABLE_MODELS = [
  {
    id: 1,
    name: "Model 1",
    url: "https://res.cloudinary.com/doiezptnn/image/upload/v1776419396/Gemini_Generated_Image_ph7vy8ph7vy8ph7v_x96jvb.png",
  },
  {
    id: 2,
    name: "Model 2",
    url: "https://res.cloudinary.com/doiezptnn/image/upload/v1776419396/Gemini_Generated_Image_dxkcbydxkcbydxkc_kmmpmu.png",
  },
  {
    id: 3,
    name: "Model 3",
    url: "https://res.cloudinary.com/doiezptnn/image/upload/v1777898050/Gemini_Generated_Image_ealunlealunlealu_ltetwm.png",
  },
  {
    id: 4,
    name: "Model 4",
    url: "https://res.cloudinary.com/doiezptnn/image/upload/v1776758086/Gemini_Generated_Image_atdlxxatdlxxatdl_o1r5uq.png",
  },
];

// High quality mock fashion catalog views for the demo
const MOCK_GENERATED_VIEWS = {
  front: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  left: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
  right: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  back: "https://images.unsplash.com/photo-1583391733958-d25e07fac200?auto=format&fit=crop&w=800&q=80"
};

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

  const isSaree = productData.dressType?.toLowerCase() === 'saree';
  
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
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [error, setError] = useState(null);

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

  const progressPercent = useMemo(() => {
    const idx = step ? VIEW_ORDER.indexOf(step) : -1;
    if (idx < 0) return generating ? 5 : 0;
    return Math.min(100, Math.round(((idx + 1) / VIEW_ORDER.length) * 100));
  }, [step, generating]);

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

  const startGeneration = () => {
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

    setTimeout(() => { setStep("front"); setStatus("Generating front view (virtual try-on)..."); }, 1000);
    setTimeout(() => { setViews(prev => ({ ...prev, front: MOCK_GENERATED_VIEWS.front })); setStep("left"); setStatus("Generating sitting view (Gemini)..."); }, 3500);
    setTimeout(() => { setViews(prev => ({ ...prev, left: MOCK_GENERATED_VIEWS.left })); setStep("right"); setStatus("Generating right view (Gemini)..."); }, 6000);
    setTimeout(() => { setViews(prev => ({ ...prev, right: MOCK_GENERATED_VIEWS.right })); setStep("back"); setStatus("Generating back view (Gemini)..."); }, 8500);
    setTimeout(() => {
      const finalViews = { ...MOCK_GENERATED_VIEWS };
      setViews(finalViews);
      setStep("back");
      setStatus("Generation complete.");
      setGenerating(false);
      
      updateProductData("generatedGarmentViews", finalViews);
      updateProductData("hasGeneratedGarment", true);
      updateProductData("imageUrls", [
        finalViews.front,
        finalViews.left,
        finalViews.right,
        finalViews.back
      ]);
      
      if (onGenerationComplete) onGenerationComplete();
    }, 11000);
  };

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

          const borderStyle = required 
            ? '1px dashed var(--accent-gold)' 
            : '1px dashed var(--border-focus)';

          return (
            <div
              key={key}
              className="glass-panel"
              style={{ 
                border: borderStyle, 
                padding: file ? '0' : '16px',
                height: '160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
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
        <button
          onClick={startGeneration}
          disabled={generating || fields.some(f => f.required && !files[f.key])}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}
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
                      <img
                        src={url}
                        alt={`${displayLabel} view`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
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
