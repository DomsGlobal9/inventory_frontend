import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, SwitchCamera } from 'lucide-react';

/**
 * The camera inside the app, for photographing a garment (13 Nov 2026).
 *
 * The CAMERA buttons used to hand over to the phone's own camera app (`<input capture>`). On a phone short of
 * memory Android closes the browser while the camera app is open, so after "OK" the owner saw "memory too low,
 * the operation was not done" -- and lost the product they were half-way through adding. Here the camera runs
 * inside the page, so the app is never put in the background.
 *
 * The photograph is taken at the camera's full resolution where the phone allows it (ImageCapture.takePhoto, on
 * Android Chrome), which is what the catalogue views are generated from; elsewhere it is the sharpest frame of
 * the live picture (up to 4096 px). It comes back as an ordinary JPEG File, exactly like the old picker's.
 *
 * Every way it can go wrong ends in something to do: permission off, camera busy, none found or no support all
 * say so in words and offer the phone's camera app and the gallery. The shutter fires once per tap; the camera
 * is let go on taking the photo, on closing, and when the owner switches to another app.
 */
/**
 * The CAMERA button. Opens the camera inside the app; keeps the phone's camera app (`capture`) and the gallery
 * as the ways on when the camera cannot run here. Hands back an array of Files, as the old inputs did.
 */
export function CameraButton({ onFiles, disabled = false, className = 'btn-secondary', style, children, title }) {
  const [open, setOpen] = useState(false);
  const native = useRef(null);
  const gallery = useRef(null);
  const pick = (e) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) onFiles(f); };
  const go = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    if (disabled) return;
    if (cameraWorksHere()) setOpen(true); else native.current?.click();
  };
  return (
    <>
      <button type="button" className={className} style={style} onClick={go} disabled={disabled}>{children}</button>
      <input ref={native} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick} tabIndex={-1} aria-hidden="true" />
      <input ref={gallery} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} tabIndex={-1} aria-hidden="true" />
      {open && (
        <PhotoCamera title={title}
          onFile={(f) => { setOpen(false); onFiles([f]); }}
          onClose={() => setOpen(false)}
          onPhoneCamera={() => { setOpen(false); native.current?.click(); }}
          onGallery={() => { setOpen(false); gallery.current?.click(); }} />
      )}
    </>
  );
}

export const cameraWorksHere = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

function why(err) {
  const n = err?.name ?? '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera permission is off for ScaleEzy. Allow the camera in your browser settings, or use one of these instead.';
  if (n === 'NotReadableError' || n === 'AbortError' || n === 'TrackStartError') return 'The camera is busy in another app. Close that app and try again, or use one of these instead.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') return 'No camera was found on this device. Choose a photo instead.';
  return 'The camera could not start. Use one of these instead.';
}

const MAX_SIDE = 4096;

function frameToFile(video) {
  const w0 = video.videoWidth, h0 = video.videoHeight;
  if (!w0 || !h0) return Promise.reject(new Error('The camera has no picture yet. Please try again.'));
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * scale); canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('This phone could not take the photo. Please use the gallery.'));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(b => {
    canvas.width = 0; canvas.height = 0;
    b ? resolve(b) : reject(new Error('This phone could not take the photo. Please use the gallery.'));
  }, 'image/jpeg', 0.92));
}

export default function PhotoCamera({ title = 'Take a photo', onFile, onClose, onPhoneCamera, onGallery }) {
  const video = useRef(null);
  const stream = useRef(null);
  const taking = useRef(false);
  const turn = useRef(0);
  const [facing, setFacing] = useState('environment');
  const [state, setState] = useState('starting'); // starting | live | paused | failed | taking
  const [problem, setProblem] = useState(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  // Only the newest start may keep a camera: one finishing late after a close or a flip switches itself off.
  const start = useCallback(async (which) => {
    const mine = ++turn.current;
    stop();
    setState('starting'); setProblem(null);
    if (!cameraWorksHere()) { setState('failed'); setProblem('This browser cannot open the camera here. Use one of these instead.'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: which }, width: { ideal: 3840 }, height: { ideal: 2160 } }
      });
      if (mine !== turn.current || !video.current) { s.getTracks().forEach(t => t.stop()); return; }
      stream.current = s;
      video.current.srcObject = s;
      await video.current.play().catch(() => undefined);
      if (mine === turn.current) setState('live');
    } catch (err) {
      if (mine !== turn.current) return;
      stop();
      setState('failed'); setProblem(why(err));
    }
  }, [stop]);

  useEffect(() => { void start(facing); return () => { turn.current++; stop(); }; }, [facing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const away = () => { if (document.hidden) { turn.current++; stop(); setState(s => (s === 'failed' ? s : 'paused')); } };
    document.addEventListener('visibilitychange', away);
    return () => document.removeEventListener('visibilitychange', away);
  }, [stop]);

  const shoot = async () => {
    const v = video.current;
    if (taking.current || state !== 'live' || !v) return;
    taking.current = true;
    setState('taking');
    try {
      let blob = null;
      const track = stream.current?.getVideoTracks?.()[0];
      // Full sensor resolution where the phone offers it; the live frame otherwise.
      if (track && typeof window.ImageCapture === 'function') {
        try { blob = await new window.ImageCapture(track).takePhoto(); } catch { blob = null; }
      }
      if (!blob) blob = await frameToFile(v);
      turn.current++;
      stop();
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg', lastModified: Date.now() });
      onFile(file);
    } catch (err) {
      taking.current = false;
      setState('failed'); setProblem(err?.message ?? 'The photo could not be taken. Please try again.');
    }
  };

  const close = () => { turn.current++; stop(); onClose(); };
  const way = (fn) => () => { turn.current++; stop(); fn(); };

  return (
    <div role="dialog" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', color: '#fff', flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>{title}</span>
        <button type="button" onClick={close} aria-label="Close the camera"
          style={{ background: 'none', border: 'none', color: '#fff', padding: '6px', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <video ref={video} playsInline muted autoPlay aria-label="Camera"
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />

        {(state === 'starting' || state === 'taking') && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', color: '#fff', gap: '10px', background: state === 'taking' ? 'rgba(0,0,0,.35)' : undefined }}>
            <Loader2 size={28} className="animate-spin" />
            <span style={{ fontSize: '13px' }} role="status">{state === 'taking' ? 'Taking the photo…' : 'Opening the camera…'}</span>
          </div>
        )}

        {state === 'paused' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: '14px', color: '#fff', padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>The camera was paused while you were away.</p>
            <button type="button" className="btn-primary" onClick={() => start(facing)}>Start the camera</button>
          </div>
        )}

        {state === 'failed' && (
          <div role="alert" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: '14px', color: '#fff', padding: '24px', textAlign: 'center' }}>
            <Camera size={30} style={{ opacity: .7, margin: '0 auto' }} />
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, maxWidth: '320px' }}>{problem}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onPhoneCamera && <button type="button" className="btn-secondary" style={{ background: '#fff', color: '#000' }} onClick={way(onPhoneCamera)}>Phone camera</button>}
              {onGallery && <button type="button" className="btn-secondary" style={{ background: '#fff', color: '#000' }} onClick={way(onGallery)}>Choose a photo</button>}
            </div>
            {cameraWorksHere() && <button type="button" onClick={() => start(facing)} style={{ background: 'none', border: 0, color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}>Try the camera again</button>}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '16px 24px 24px', flexShrink: 0 }}>
        <button type="button" onClick={close} style={{ justifySelf: 'start', background: 'none', border: 0, color: '#fff', fontSize: '15px', cursor: 'pointer', padding: '10px 4px' }}>Cancel</button>
        <button type="button" onClick={shoot} disabled={state !== 'live'} aria-label="Take the photo"
          style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff', background: 'transparent', padding: 4, cursor: state === 'live' ? 'pointer' : 'default', opacity: state === 'live' ? 1 : .45 }}>
          <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: '#A6D92B' }} />
        </button>
        <button type="button" onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))} disabled={state === 'taking'}
          aria-label={facing === 'user' ? 'Use the back camera' : 'Use the front camera'}
          style={{ justifySelf: 'end', width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.08)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <SwitchCamera size={20} />
        </button>
      </div>
    </div>
  );
}
