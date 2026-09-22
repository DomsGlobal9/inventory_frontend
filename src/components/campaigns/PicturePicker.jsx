import React, { useRef, useState } from 'react';
import { ImagePlus, Upload, X, Search, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUploadCampaignPicture, usePictureFromProduct, useProductPhotos } from '../../hooks/useCampaigns';

/**
 * The picture above a campaign's words: a photo from this device, or one of the shop's product
 * photos. Either way the server makes a WhatsApp-ready copy (a small JPEG with no hidden photo
 * data) and that copy is what customers get -- so what shows here is exactly what goes.
 *
 * `value` is the chosen picture ({ id, url, width, height }) or null; `onChange` gets the next one.
 */
const MAX_BYTES = 15 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('That file could not be read.'));
  r.readAsDataURL(file);
});

export default function PicturePicker({ value, onChange, disabled, label = 'Picture (optional)' }) {
  const fileRef = useRef(null);
  const upload = useUploadCampaignPicture();
  const fromProduct = usePictureFromProduct();
  const [browsing, setBrowsing] = useState(false);
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  const photos = useProductPhotos(asked, { enabled: browsing });
  const busy = upload.isPending || fromProduct.isPending;

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Said here, before a long upload; the server checks again.
    if (file.size > MAX_BYTES) return toast.error('That picture is larger than 15 MB. Choose a smaller one.');
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return toast.error('This is an iPhone HEIC photo. Share it as a JPEG (or set the camera to "Most Compatible") and choose it again.');
    }
    try {
      onChange(await upload.mutateAsync(await readAsDataUrl(file)));
    } catch (err) { toast.error(err?.message || 'The picture could not be used.'); }
  };

  const pickProduct = async (imageId) => {
    try {
      onChange(await fromProduct.mutateAsync(imageId));
      setBrowsing(false);
    } catch (err) { toast.error(err?.message || 'That photo could not be used.'); }
  };

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>{label}</div>
      {value ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <img src={value.url} alt="The picture customers will get" style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
          <div style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{value.width} × {value.height}</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => fileRef.current?.click()} style={{ padding: '4px 10px', fontSize: '12px' }}>Change</button>
              <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => onChange(null)}
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={13} /> Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => fileRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            {upload.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload a photo
          </button>
          <button type="button" className="btn-secondary" disabled={disabled || busy} onClick={() => setBrowsing(b => !b)} aria-expanded={browsing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Package size={15} /> Choose a product photo
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={pickFile} style={{ display: 'none' }} aria-label="Choose a photo" />

      {browsing && !value && (
        <div style={{ marginTop: '10px', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px' }}>
          {/* Not a <form>: this sits inside the campaign editor's form, and a form inside a form is
              ignored by browsers -- its Search button would submit (save) the whole campaign. */}
          <div role="search" style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <input className="input-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" aria-label="Search your products" style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setAsked(q.trim()); } }} />
            <button type="button" className="btn-secondary" aria-label="Search" onClick={() => setAsked(q.trim())} style={{ padding: '6px 10px' }}><Search size={15} /></button>
          </div>
          {photos.isLoading ? <Loader2 size={16} className="animate-spin" />
            : photos.error ? <span style={{ fontSize: '13px', color: 'var(--danger, #dc2626)' }}>{photos.error.message}</span>
            : !photos.data?.length ? <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No products with photos{asked ? ` match "${asked}"` : ''}.</span>
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {photos.data.map(p => (
                  <li key={p.id}>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', overflowWrap: 'anywhere' }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {p.images.map(i => (
                        <button key={i.id} type="button" disabled={busy} onClick={() => pickProduct(i.id)} aria-label={`Use this photo of ${p.title}`}
                          style={{ padding: 0, border: '1px solid var(--border-light)', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: 'none', width: '64px', height: '64px' }}>
                          <img src={i.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          {fromProduct.isPending && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}><Loader2 size={13} className="animate-spin" /> Making it ready for WhatsApp…</div>}
        </div>
      )}
      {!value && !browsing && (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <ImagePlus size={13} /> A photo of what is on offer gets more customers to look. Name it in the words too, in case the picture does not load.
        </p>
      )}
    </div>
  );
}
