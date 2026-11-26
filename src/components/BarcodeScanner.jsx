import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, Flashlight } from 'lucide-react';

/**
 * The phone's camera as a barcode and QR scanner, on Android AND iPhone (search, shelves).
 *
 * FAST, the same way POS's scanner was made fast (25-26 Nov 2026, the owner: "the same thing here, for searching the
 * barcode and QR, everything"):
 *   ONLY THE AIMING BOX IS READ. Each frame is cropped to the box before reading, so the price-tag text, a logo or a
 *     second code beside it are never looked at, and each try is quick. The box is wide and tall enough for a QR.
 *   TRIED EVERY 60 ms (it was 150-250 ms over the whole picture, with ZXing's slow "try harder").
 *   The phone's own BarcodeDetector where it has one (Chrome on Android: the chip does the work); ZXing elsewhere
 *     (iPhone, desktop), loaded only the first time it is needed.
 *   The rear camera at 1280 x 720 with continuous focus; a torch button where the phone has one; a beep and a buzz.
 *   Every 4th try reads the whole picture instead, so a code held too close to fit the box is still read.
 * One code, then it closes (the search and the shelves look one thing up per scan).
 *
 * The camera is released on every exit path (a code, closing, an error, the component going away): a page that keeps
 * the camera light on after the sheet closes is a phone whose camera app will not open.
 */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'codabar', 'itf', 'upc_a', 'upc_e', 'qr_code'];
const EVERY_MS = 60;
// The aiming box, as fractions of the visible picture: wide, and tall enough for a QR code.
const BOX = { left: 0.08, right: 0.92, top: 0.3, bottom: 0.66 };

/** A camera is enough: ZXing reads the frames wherever the browser has no reader of its own. */
export const scanningSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** ZXing, tuned to the same formats, loaded on first use. */
async function zxingReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library')
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
    BarcodeFormat.CODABAR, BarcodeFormat.ITF, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.QR_CODE
  ]);
  return new BrowserMultiFormatReader(hints);
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = beep.ctx ?? (beep.ctx = new Ctx());
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 1760; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  } catch { /* no sound: the buzz still says it */ }
}

export default function BarcodeScanner({ onFound, onClose, title = 'Point at the barcode' }) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  /*
   * The latest onFound, read at the moment a code is found. Both callers pass a new function on every render, and
   * when the camera effect depended on it, any re-render during a scan tore the camera down and opened it again.
   */
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;
  const [problem, setProblem] = useState(null);
  const [starting, setStarting] = useState(true);
  const [torch, setTorch] = useState(null); // null: this camera has none

  useEffect(() => {
    let stopped = false;
    let stream = null;
    let timer = null;
    let busy = false;
    let detector = null;
    let reader = null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      trackRef.current = null;
    };

    // The part of the camera picture inside the aiming box, in the video's own pixels (object-fit: cover).
    function boxInVideo(v) {
      const vw = v.videoWidth, vh = v.videoHeight, ew = v.clientWidth, eh = v.clientHeight;
      const scale = Math.max(ew / vw, eh / vh);
      const ox = (vw * scale - ew) / 2, oy = (vh * scale - eh) / 2;
      const x = (BOX.left * ew + ox) / scale, y = (BOX.top * eh + oy) / scale;
      const w = ((BOX.right - BOX.left) * ew) / scale, h = ((BOX.bottom - BOX.top) * eh) / scale;
      return { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(vw, w), h: Math.min(vh, h) };
    }

    let tries = 0;
    async function readOnce() {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return null;
      // Every 4th try reads the whole picture: a QR held too close to fit the box is still read (about 4 a second).
      const whole = ++tries % 4 === 0;
      const b = whole ? { x: 0, y: 0, w: v.videoWidth, h: v.videoHeight } : boxInVideo(v);
      // Only the box, at most 960 px wide: enough for a code's bars or squares, and quick to read.
      const scale = Math.min(1, 960 / b.w);
      canvas.width = Math.round(b.w * scale); canvas.height = Math.round(b.h * scale);
      ctx.drawImage(v, b.x, b.y, b.w, b.h, 0, 0, canvas.width, canvas.height);
      if (detector) {
        const codes = await detector.detect(canvas);
        return codes?.[0]?.rawValue ?? null;
      }
      try { return reader.decodeFromCanvas(canvas).getText(); } catch { return null; }
    }

    async function tick() {
      if (stopped) return;
      if (!busy) {
        busy = true;
        try {
          const value = String((await readOnce()) ?? '').trim();
          if (value && !stopped) {
            stop();
            // A short buzz and a beep: the person is looking at the shelf, not the screen.
            navigator.vibrate?.(50);
            beep();
            onFoundRef.current(value);
            return;
          }
        } catch { /* one frame that cannot be read is nothing: the next is 60 ms away */ }
        busy = false;
      }
      timer = setTimeout(tick, EVERY_MS);
    }

    async function start() {
      if (!scanningSupported()) {
        setProblem('This browser cannot open the camera. Type the code instead.');
        setStarting(false);
        return;
      }
      try {
        if ('BarcodeDetector' in window) {
          const supported = await window.BarcodeDetector.getSupportedFormats?.().catch(() => []) ?? [];
          const use = FORMATS.filter(f => supported.includes(f));
          // eslint-disable-next-line no-undef
          if (use.length) detector = new BarcodeDetector({ formats: use });
        }
        if (!detector) {
          try {
            reader = await zxingReader();
          } catch {
            // The reader is a separate download; on a dropped connection it may not arrive.
            if (!stopped) { setProblem('The scanner could not load. Check the connection, or type the code.'); setStarting(false); }
            return;
          }
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' }] }
        });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        try { if (track.getCapabilities?.().torch) setTorch(false); } catch { /* no torch */ }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStarting(false);
        tick();
      } catch (e) {
        if (stopped) return;
        setStarting(false);
        setProblem(
          e?.name === 'NotAllowedError'
            ? 'The camera was not allowed. Turn it on for this site in your browser settings, or type the code.'
            : e?.name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : 'The camera could not be opened. Type the code instead.'
        );
        stop();
      }
    }

    // Started one tick later and cancelled if torn down first: React (in development) sets an effect up, tears it
    // down and sets it up again, and a camera started at once could be stopped under the second run.
    const begin = setTimeout(start, 0);
    return () => { clearTimeout(begin); stop(); };
  }, []);

  async function toggleTorch() {
    const t = trackRef.current;
    if (!t) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torch }] }); setTorch(!torch); } catch { setTorch(null); }
  }

  const box = {
    position: 'absolute', left: `${BOX.left * 100}%`, right: `${(1 - BOX.right) * 100}%`, top: `${BOX.top * 100}%`, bottom: `${(1 - BOX.bottom) * 100}%`,
    borderRadius: '14px', border: '2px solid rgba(255,255,255,.95)', boxShadow: '0 0 0 100vmax rgba(0,0,0,.5)'
  };

  return (
    <div role="dialog" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: '#000' }}>
      <video ref={videoRef} playsInline muted autoPlay
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Only what is inside the box is read; everything outside is dimmed. */}
      {!problem && !starting && <div aria-hidden="true" style={box} />}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', color: '#fff' }}>
        <span style={{ fontSize: '15px', fontWeight: 600 }}>{title}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {torch !== null && (
            <button type="button" onClick={toggleTorch} aria-label={torch ? 'Torch off' : 'Torch on'} aria-pressed={torch}
              style={{ background: torch ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.35)', color: torch ? '#000' : '#fff', border: '1px solid rgba(255,255,255,.6)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Flashlight size={20} />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close the scanner"
            style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.6)', borderRadius: 10, color: '#fff', padding: '6px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {starting && !problem && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', color: '#fff', gap: '10px' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto' }} />
          <span style={{ fontSize: '13px' }}>Opening the camera…</span>
        </div>
      )}

      {problem && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center', color: '#fff', gap: '14px', alignContent: 'center' }}>
          <Camera size={30} style={{ opacity: .7, margin: '0 auto' }} />
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, maxWidth: '300px' }}>{problem}</p>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ background: '#fff', color: '#000', justifySelf: 'center' }}>
            Type it instead
          </button>
        </div>
      )}

      {!problem && !starting && (
        <p style={{ position: 'absolute', left: 0, right: 0, bottom: 0, color: 'rgba(255,255,255,.85)', fontSize: '13px', textAlign: 'center', padding: '14px 24px max(18px, env(safe-area-inset-bottom))', margin: 0 }}>
          Put the barcode or QR code inside the box. It reads on its own.
        </p>
      )}
    </div>
  );
}
