import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Shirt, Camera, Loader2, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * Try-on at the counter.
 *
 * A customer is standing in front of the salesperson holding a saree and asking the obvious
 * question. Until now the only answer this app had was the QR code beside this button: print it,
 * hand them the garment, hope they scan it, hope they have the app. That works for somebody
 * browsing alone; it is useless with a customer already at the counter.
 *
 * So the salesperson takes the photograph themselves. On a phone or a tablet `capture` opens the
 * camera straight away, which is the whole point -- the customer is right there.
 *
 * The photograph is sent once, used once, and deleted by the server as soon as the picture is
 * made. It is never stored by this screen either: it lives in this component's memory until the
 * box is closed. Said on the screen, because taking a picture of a customer without saying what
 * happens to it is not a reasonable thing to do.
 */
export default function CounterTryOn({ product, onClose }) {
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) return toast.error('That photograph is very large. Take another one.');
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return toast.error('This is an iPhone HEIC photo. Set the camera to "Most Compatible" and try again.');
    }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result); setResult(null); };
    reader.onerror = () => toast.error('That photograph could not be read.');
    reader.readAsDataURL(file);
  };

  const go = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tryon/${product.id}`, { photo });
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
            <div style={box}><img src={result} alt={`${product.title}, on the customer`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0' }}>
              A picture made by a computer, to give an idea. The real thing may sit differently.
            </p>
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
            <div style={box}><img src={photo} alt="The photograph you took" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
              <button className="btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>Retake</button>
              <button className="btn-primary" disabled={busy} onClick={go}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {busy ? <><Loader2 size={15} className="animate-spin" /> Putting it on…</> : 'See it on them'}
              </button>
            </div>
            {busy ? <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0', textAlign: 'center' }}>This takes a few seconds.</p> : null}
          </>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Take a full-length photograph of the customer, straight on, with a plain background if
              you can. It is used once to make the picture and then deleted — nothing is kept.
            </p>
            <button className="btn-primary" onClick={() => fileRef.current?.click()}
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Camera size={16} /> Take a photograph
            </button>
          </>
        )}

        {/* `capture` opens the camera on a phone or tablet, which is where a salesperson is
            standing. On a laptop it falls back to choosing a file, which is the right thing. */}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
          onChange={pick} style={{ display: 'none' }} aria-label="Photograph of the customer" />
      </div>
    </div>, document.body)
  );
}
