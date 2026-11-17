import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { pricePerUnit, qtyShown, unitOf } from '../../lib/units';

/**
 * Shared by the reel link screens (redesign 16 Nov, option A: a wall of reel cards, and a three-column studio).
 * They use the whole width of the page. Flat surfaces, the ScaleEzy greens, photos doing the talking.
 */

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** "₹8,500", "₹450 / m", "₹1,200 to ₹1,800". Prices of a measured piece are stored per centimetre. */
export function priceText(p) {
  if (p?.priceFrom == null) return 'No price';
  const per = unitOf(p.soldBy).whole ? '' : ` / ${unitOf(p.soldBy).per}`;
  const from = pricePerUnit(p.priceFrom, p.soldBy), to = pricePerUnit(p.priceTo, p.soldBy);
  return from === to ? `${rupees(from)}${per}` : `${rupees(from)} to ${rupees(to)}${per}`;
}

export const stockText = (p) => (p?.inStock > 0 ? `${qtyShown(p.inStock, p.soldBy)} in stock` : 'Out of stock');

/** "Reel 12: Diwali silk edit" -> { number: '12', rest: 'Diwali silk edit' }. A title without "Reel N" keeps it whole. */
export function reelParts(title = '') {
  const m = /^\s*reel\s+(\d+)\s*[:\-–]?\s*(.*)$/i.exec(title);
  return m ? { number: m[1], rest: m[2] || `Reel ${m[1]}` } : { number: null, rest: title };
}

export async function copy(text, what = 'Link') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    // Some browsers refuse the clipboard on plain http or inside a frame: show it so it can be copied by hand.
    window.prompt(`Copy the ${what.toLowerCase()}:`, text);
  }
}

/** A piece's photo, or a quiet empty frame of the same size. */
export function Thumb({ src, size = 'md', alt = '' }) {
  return src
    ? <img className={`rl-thumb rl-thumb-${size}`} src={src} alt={alt} loading="lazy" />
    : <span className={`rl-thumb rl-thumb-${size} rl-thumb-empty`} aria-hidden="true" />;
}

/** On / off, as a switch. A real button (keyboard, screen readers): its label says what it is and what it will do. */
export function ReelSwitch({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={`rl-switch${on ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange?.(!on); }}>
      <span />
    </button>
  );
}

/** The link's QR code, big enough to print or show on a phone, with a download. */
export function QrDialog({ url, name, title, onClose }) {
  const ref = useDialog(!!url, { onClose });
  const titleId = useId();
  const wrap = useRef(null);
  if (!url) return null;
  const download = () => {
    const canvas = wrap.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${name || 'reel-link'}-qr.png`;
    a.click();
  };
  return createPortal(
    <div className="rl-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="rl-dialog">
        <div className="rl-dialog-head">
          <b id={titleId}>{title || 'QR code'}</b>
          <button type="button" className="rl-icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="rl-qr-big" ref={wrap}><QRCodeCanvas value={url} size={240} level="M" marginSize={2} /></div>
        <p className="rl-url" style={{ textAlign: 'center', margin: '10px 0 14px' }}>{url.replace(/^https?:\/\//, '')}</p>
        <div className="rl-row-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-primary" onClick={download}>Download QR</button>
          <button type="button" className="btn-secondary" onClick={() => copy(url)}>Copy link</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * The reel's Instagram address as Instagram's own player, or null (17 Nov 2026). The same rule as the server's
 * reel-links instagramPlayer: an https Instagram reel or post, rebuilt from its code alone.
 */
export function instagramPlayer(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || !['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(u.hostname.toLowerCase())) return null;
    const m = /^\/(?:[A-Za-z0-9._]{1,30}\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})\/?$/.exec(u.pathname);
    if (!m) return null;
    const kind = m[1] === 'reels' ? 'reel' : m[1];
    return { url: `https://www.instagram.com/${kind}/${m[2]}/`, embed: `https://www.instagram.com/${kind}/${m[2]}/embed/` };
  } catch { return null; }
}

/** The reel itself, playing here in Inventory (the owner's side, 17 Nov 2026), in Instagram's own player. */
export function ReelVideoDialog({ reelUrl, title, onClose }) {
  const player = instagramPlayer(reelUrl);
  const ref = useDialog(!!player, { onClose });
  const titleId = useId();
  if (!player) return null;
  return createPortal(
    <div className="rl-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="rl-dialog rl-video-dialog">
        <div className="rl-dialog-head">
          <b id={titleId} className="rl-video-title">{title || 'The reel'}</b>
          <button type="button" className="rl-icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <iframe className="rl-video" src={player.embed} title={`${title || 'The reel'} on Instagram`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        <div className="rl-row-actions" style={{ justifyContent: 'center', marginTop: 12 }}>
          <a className="btn-secondary" href={player.url} target="_blank" rel="noreferrer">Open on Instagram</a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const RL_CSS = `
.rl-video-dialog { width: min(440px, 100%); padding: 14px 14px 16px; }
.rl-video-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rl-play { position: absolute; right: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 11px; border-radius: 16px; border: 0; background: rgba(15, 18, 16, .78); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.rl-play i { width: 0; height: 0; border-left: 8px solid #fff; border-top: 5px solid transparent; border-bottom: 5px solid transparent; }
.rl-play:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.rl-urlrow { display: flex; gap: 8px; }
.rl-urlrow .input-field { flex: 1; min-width: 0; }
.rl-urlrow .btn-secondary { flex: none; white-space: nowrap; }
.rl-video { display: block; width: 100%; height: min(680px, calc(100vh - 170px)); border: 0; border-radius: 10px; background: var(--bg-input); }
.rl-page { display: grid; gap: 18px; width: 100%; min-width: 0; }
.rl-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.rl-head > div { min-width: 0; }
.rl-head h1 { overflow-wrap: anywhere; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: var(--text-primary); }
.rl-head p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; max-width: 720px; }
.rl-crumb { color: var(--text-secondary); font-size: 13px; display: inline-flex; gap: 6px; align-items: center; text-decoration: none; }
.rl-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px; min-width: 0; }
.rl-strip { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 16px; border: 1px solid var(--border-light); border-radius: 12px; background: var(--bg-card); }
.rl-strip b { color: var(--text-primary); }
.rl-strip p { margin: 3px 0 0; color: var(--text-secondary); font-size: 13px; max-width: 640px; }
.rl-url { font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); word-break: break-all; }
.rl-row-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.rl-note { color: var(--text-secondary); font-size: 13px; margin: 0; }
.rl-warn { color: var(--accent-warning); font-size: 13px; }
.rl-sub { color: var(--text-secondary); font-size: 13px; }
.rl-title { font-weight: 700; color: var(--text-primary); overflow-wrap: anywhere; }
.rl-thumb { display: block; object-fit: cover; border-radius: 8px; background: var(--bg-input); flex: none; }
.rl-thumb-sm { width: 40px; height: 52px; } .rl-thumb-md { width: 48px; height: 62px; } .rl-thumb-lg { width: 100%; aspect-ratio: 3 / 4; height: auto; }
.rl-thumb-empty { border: 1px solid var(--border-light); }
.rl-icon-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; }
.rl-icon-btn:disabled { opacity: .35; cursor: default; }
.rl-icon-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-hover); }

/* the bio band: the one link that works from a reel's caption */
.rl-bio { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 20px; border-radius: 14px; background: var(--brand-deep); color: #fff; }
.rl-bio b { color: #fff; font-size: 15px; }
.rl-bio p { margin: 3px 0 0; font-size: 13px; color: rgba(255,255,255,.8); max-width: 720px; }
.rl-bio .rl-url { color: var(--brand); background: rgba(255,255,255,.1); padding: 7px 11px; border-radius: 8px; }
.rl-bio .rl-lime { background: var(--brand); color: #0B2410; border: 1px solid var(--brand); border-radius: 10px; padding: 8px 14px; font-weight: 600; cursor: pointer; }

/* numbers */
.rl-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.rl-stat { padding: 14px 16px; }
.rl-stat .k { color: var(--text-secondary); font-size: 12.5px; }
.rl-stat .v { font-size: 24px; font-weight: 800; letter-spacing: -.01em; color: var(--text-primary); font-variant-numeric: tabular-nums; margin-top: 2px; }
.rl-stat .v small { font-size: 13px; font-weight: 500; color: var(--text-secondary); }

/* the wall of reels */
.rl-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; }
.rl-reel { display: flex; flex-direction: column; border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; background: var(--bg-card); cursor: pointer; min-width: 0; transition: border-color .15s; }
.rl-reel:hover { border-color: var(--border-focus); }
.rl-reel:focus-visible { outline: 2px solid var(--brand-solid); outline-offset: 2px; }
.rl-reel.off .rl-cover { filter: grayscale(.85); opacity: .7; }
.rl-cover { position: relative; aspect-ratio: 3 / 4; display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; background: var(--bg-input); }
.rl-cover > img, .rl-cover > .rl-cover-empty { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; background: var(--bg-input); }
.rl-cover > :first-child { grid-row: span 2; }
.rl-cover.one { grid-template-columns: 1fr; grid-template-rows: 1fr; } .rl-cover.one > :first-child { grid-row: auto; }
.rl-cover.two > :nth-child(2) { grid-row: span 2; }
.rl-cover-empty { display: flex !important; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 13px; }
.rl-tag { position: absolute; left: 10px; top: 10px; background: rgba(0,0,0,.6); color: #fff; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 7px; }
.rl-reel-body { padding: 11px 12px 12px; display: grid; gap: 8px; }
.rl-reel-title { font-weight: 700; font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-reel-meta { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); min-height: 22px; }
.rl-reel-meta span:first-child { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-reel-acts { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.rl-newreel { border: 1.5px solid var(--border-focus); background: var(--bg-hover); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 320px; color: var(--brand-ink); font-weight: 700; cursor: pointer; text-align: center; padding: 16px; }
.rl-newreel .plus { font-size: 34px; line-height: 1; font-weight: 400; }
.rl-newreel small { color: var(--text-secondary); font-weight: 500; }

/* switch */
.rl-switch { width: 38px; height: 22px; border-radius: 22px; border: 0; padding: 0; background: var(--border-focus); position: relative; cursor: pointer; flex: none; transition: background .15s; }
.rl-switch span { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .15s; }
.rl-switch.on { background: var(--brand-solid); }
.rl-switch.on span { left: 19px; background: var(--brand-on-solid); }
.rl-switch:disabled { opacity: .5; cursor: default; }

/* the studio: pick | order | preview and share. The preview stays beside the work at every width but a phone's. */
.rl-studio { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) 340px; grid-template-areas: "pick order side"; gap: 16px; align-items: start; }
.rl-studio.view { grid-template-columns: minmax(0, 1fr) 360px; grid-template-areas: "order side"; }
.rl-a-pick { grid-area: pick; } .rl-a-order { grid-area: order; } .rl-a-side { grid-area: side; }
.rl-colh { font-size: 12.5px; font-weight: 700; color: var(--text-secondary); margin: 0 0 10px; }
.rl-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.rl-chip { border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); border-radius: 999px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
.rl-chip.on { background: var(--brand-solid); color: var(--brand-on-solid); border-color: var(--brand-solid); }
.rl-pick { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 12px; margin-top: 14px; }
.rl-tile { all: unset; display: block; cursor: pointer; min-width: 0; }
.rl-tile .ph { position: relative; border-radius: 10px; overflow: hidden; outline: 3px solid transparent; outline-offset: 2px; transition: outline-color .12s; }
.rl-tile.in .ph { outline-color: var(--brand); }
.rl-tile:focus-visible .ph { outline-color: var(--brand-solid); }
.rl-tile .n { position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; border-radius: 50%; background: var(--brand); color: #0B2410; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.rl-tile .so { position: absolute; left: 6px; bottom: 6px; background: rgba(0,0,0,.6); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 5px; }
.rl-tile .cap { font-size: 12.5px; color: var(--text-primary); margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-tile .cap small { display: block; color: var(--text-secondary); font-size: 12px; }
.rl-tile.full { opacity: .45; cursor: default; }
.rl-line { display: grid; grid-template-columns: 16px auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 6px 8px 4px; border: 1px solid var(--border-light); border-radius: 12px; margin-bottom: 8px; background: var(--bg-card); }
.rl-line-ph { position: relative; display: block; }
.rl-num { position: absolute; left: -5px; top: -5px; min-width: 20px; height: 20px; padding: 0 4px; box-sizing: border-box; border-radius: 10px; background: var(--brand); color: #0B2410; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg-card); }
.rl-line-name { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35; }
.rl-line-sub { font-size: 12.5px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; margin-top: 1px; }
.rl-line-sub.rl-warn { color: var(--accent-warning); white-space: normal; }
.rl-line .rl-colour { margin-top: 6px; width: 160px; max-width: 100%; }
.rl-line .rl-icon-btn { width: 28px; height: 28px; border-color: transparent; background: transparent; }
.rl-line .rl-icon-btn:hover:not(:disabled) { border-color: var(--border-light); }
.rl-line.drag { opacity: .4; }
.rl-line.over { border-color: var(--brand-solid); }
.rl-grip { color: var(--text-muted); cursor: grab; display: flex; justify-content: center; }
.rl-line .rl-order { display: flex; gap: 2px; }
.rl-field { display: grid; gap: 6px; margin-bottom: 14px; }
.rl-field > span { font-size: 12.5px; font-weight: 700; color: var(--text-secondary); }
.rl-sticky { position: sticky; top: 12px; display: grid; gap: 12px; }
.rl-phone { width: 290px; margin: 0 auto; border: 10px solid #111; border-radius: 36px; overflow: hidden; background: #fff; color: #18181b; }
.rl-phone-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: var(--rl-accent, #164B1E); color: #fff; font-weight: 700; font-size: 13px; }
.rl-phone-logo { width: 26px; height: 26px; border-radius: 7px; object-fit: cover; background: #A6D92B; color: #0B2410; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
.rl-phone-body { padding: 12px; min-height: 220px; }
.rl-phone-title { font-weight: 800; margin: 0; font-size: 15px; }
.rl-phone-sub { color: #71717a; font-size: 12px; margin: 2px 0 8px; }
.rl-phone-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.rl-phone-grid > div { min-width: 0; }
.rl-phone-grid .gone { opacity: .45; filter: grayscale(1); }
.rl-phone-grid .rl-name { font-size: 12px; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-phone-grid .rl-price { font-size: 12px; font-weight: 700; }
.rl-share { display: grid; gap: 12px; }
.rl-share-top { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; }
.rl-qr { background: #fff; padding: 6px; border-radius: 8px; border: 1px solid var(--border-light); line-height: 0; cursor: zoom-in; }
.rl-unsaved { color: var(--accent-warning); font-size: 13px; }

/* dialog */
.rl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.rl-dialog { background: var(--bg-card); color: var(--text-primary); border-radius: 16px; padding: 18px 20px 20px; width: min(380px, 100%); outline: none; }
.rl-dialog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.rl-qr-big { display: flex; justify-content: center; background: #fff; border-radius: 12px; padding: 10px; }

@media (max-width: 1280px) {
  .rl-studio { grid-template-columns: minmax(0, 1fr) 330px; grid-template-areas: "pick side" "order side"; }
  .rl-studio.view { grid-template-areas: "order side"; }
  .rl-a-side { align-self: start; }
  .rl-phone { width: 270px; }
}
@media (max-width: 900px) {
  .rl-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rl-studio, .rl-studio.view { grid-template-columns: minmax(0, 1fr); grid-template-areas: "pick" "order" "side"; }
  .rl-studio.view { grid-template-areas: "order" "side"; }
  .rl-sticky { position: static; }
}
@media (max-width: 640px) {
  .rl-bio { grid-template-columns: minmax(0, 1fr); }
  .rl-wall { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .rl-newreel { min-height: 0; aspect-ratio: auto; padding: 22px 10px; }
  .rl-reel-acts { grid-template-columns: 1fr; }
  .rl-pick { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .rl-line { grid-template-columns: auto minmax(0, 1fr); padding-left: 10px; row-gap: 4px; }
  .rl-line .rl-order { grid-column: 2; justify-content: flex-start; margin-left: -6px; }
  .rl-line .rl-grip { display: none; }
  .rl-head .btn-primary, .rl-head .btn-secondary { min-height: 42px; }
  .rl-phone { width: 100%; max-width: 300px; }
}
`;
