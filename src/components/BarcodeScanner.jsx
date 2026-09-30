import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';

/**
 * The phone's camera as a barcode scanner.
 *
 * Uses the browser's own BarcodeDetector rather than shipping a decoding library: it is built into
 * Chrome on Android, which is what a shop's staff carry, and it costs nothing in the bundle. Where
 * it is missing -- Safari on iPhone, Firefox -- the sheet says so in one sentence and the person
 * types the code instead, which is what they do today anyway.
 *
 * The camera is released on every exit path (found a code, closed it, an error, the component
 * going away). A page that keeps the torch on after the sheet closes is the complaint that follows
 * a scanner nobody tested on a real phone.
 */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'codabar', 'itf', 'upc_a', 'upc_e', 'qr_code'];

export const scanningSupported = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function BarcodeScanner({ onFound, onClose, title = 'Point at the barcode' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const liveRef = useRef(true);
  const [problem, setProblem] = useState(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    liveRef.current = true;

    const stop = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    (async () => {
      if (!scanningSupported()) {
        setProblem('This browser cannot scan. Chrome on Android can — or type the code instead.');
        setStarting(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (!liveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStarting(false);

        // eslint-disable-next-line no-undef
        const detector = new BarcodeDetector({ formats: FORMATS });
        const tick = async () => {
          if (!liveRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes?.[0]?.rawValue?.trim();
            if (value) {
              liveRef.current = false;
              stop();
              // A short buzz: the person is looking at the shelf, not the screen.
              navigator.vibrate?.(40);
              onFound(value);
              return;
            }
          } catch { /* a frame that cannot be read is simply the next frame's problem */ }
          setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        setStarting(false);
        setProblem(
          e?.name === 'NotAllowedError'
            ? 'The camera was not allowed. Turn it on for this site in your browser settings, or type the code.'
            : e?.name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : 'The camera could not be opened. Type the code instead.'
        );
      }
    })();

    return () => { liveRef.current = false; stop(); };
  }, [onFound]);

  return (
    <div role="dialog" aria-label={title} style={{
      position: 'fixed', inset: 0, zIndex: 9500, background: '#000',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', color: '#fff', flexShrink: 0
      }}>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>{title}</span>
        <button type="button" onClick={onClose} aria-label="Close the scanner"
          style={{ background: 'none', border: 'none', color: '#fff', padding: '6px', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <video ref={videoRef} playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* The window to aim through. Nothing is cropped to it -- the whole frame is read -- but a
            person needs somewhere to point, and a bare camera view gives them nothing. */}
        {!problem && !starting && (
          <div aria-hidden="true" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(78vw, 320px)', height: '140px', borderRadius: '12px',
            border: '2px solid rgba(255,255,255,.9)', boxShadow: '0 0 0 100vmax rgba(0,0,0,.45)'
          }} />
        )}

        {starting && !problem && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', gap: '10px' }}>
            <Loader2 size={28} className="animate-spin" />
            <span style={{ fontSize: '13px' }}>Opening the camera…</span>
          </div>
        )}

        {problem && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            padding: '24px', textAlign: 'center', color: '#fff', gap: '14px', alignContent: 'center'
          }}>
            <Camera size={30} style={{ opacity: .7, margin: '0 auto' }} />
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, maxWidth: '300px' }}>{problem}</p>
            <button type="button" className="btn-secondary" onClick={onClose}
              style={{ background: '#fff', color: '#000', justifySelf: 'center' }}>
              Type it instead
            </button>
          </div>
        )}
      </div>

      {!problem && (
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: '12.5px', textAlign: 'center', padding: '14px 24px', margin: 0, flexShrink: 0 }}>
          Hold steady about a hand's width away. It reads on its own.
        </p>
      )}
    </div>
  );
}
