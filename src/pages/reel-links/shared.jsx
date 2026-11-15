import React from 'react';
import toast from 'react-hot-toast';
import { pricePerUnit, qtyShown, unitOf } from '../../lib/units';

/**
 * Shared by the reel link screens. Plain and flat: rows, aligned columns, one action per row. Phones get stacked rows
 * (no sideways scrolling) and controls at least 42 px tall.
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

export const RL_CSS = `
.rl-page { display: grid; gap: 18px; max-width: 1180px; }
.rl-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.rl-head > div { min-width: 0; }
.rl-head h1 { overflow-wrap: anywhere; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: var(--text-primary); }
.rl-head p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; max-width: 640px; }
.rl-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px; }
.rl-strip { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 16px; border: 1px solid var(--border-light); border-radius: 12px; background: var(--bg-input); }
.rl-strip b { color: var(--text-primary); }
.rl-strip p { margin: 3px 0 0; color: var(--text-secondary); font-size: 13px; max-width: 560px; }
.rl-url { font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); word-break: break-all; }
.rl-row-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.rl-note { color: var(--text-secondary); font-size: 13px; margin: 0; }
.rl-warn { color: var(--accent-warning); font-size: 13px; }
.rl-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.rl-table th, .rl-table td { text-align: left; padding: 11px 8px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
.rl-table th { color: var(--text-secondary); font-weight: 600; font-size: 12.5px; }
.rl-table td.num, .rl-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
.rl-table tbody tr { cursor: pointer; }
.rl-table tbody tr:hover { background: var(--bg-hover); }
.rl-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rl-title { font-weight: 700; color: var(--text-primary); overflow-wrap: anywhere; }
.rl-sub { color: var(--text-secondary); font-size: 12.5px; }
.rl-on { color: var(--brand-ink); font-weight: 700; }
.rl-off { color: var(--text-muted); }
.rl-thumb { display: inline-block; flex: none; object-fit: cover; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-light); }
.rl-thumb-md { width: 44px; height: 56px; }
.rl-thumb-sm { width: 36px; height: 46px; border-radius: 6px; }
.rl-thumb-lg { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 10px; }
.rl-empty { text-align: center; padding: 48px 20px; color: var(--text-secondary); }
.rl-empty h2 { margin: 0 0 6px; font-size: 17px; color: var(--text-primary); }
.rl-two { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; }
.rl-field { display: grid; gap: 6px; margin-bottom: 14px; }
.rl-field > span { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.rl-field input { min-height: 42px; }
.rl-picked { border: 1px solid var(--border-light); border-radius: 12px; }
.rl-piece { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-light); }
.rl-piece:last-child { border-bottom: 0; }
.rl-piece .rl-title { font-size: 14px; }
.rl-order { display: flex; gap: 4px; }
.rl-icon-btn { width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); cursor: pointer; }
.rl-icon-btn:disabled { opacity: .35; cursor: default; }
.rl-results { border: 1px solid var(--border-light); border-radius: 12px; max-height: 340px; overflow-y: auto; margin-top: 8px; }
.rl-result { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-light); }
.rl-result:last-child { border-bottom: 0; }
.rl-phone { border: 8px solid #111; border-radius: 28px; background: #fff; color: #16181d; overflow: hidden; font-size: 13px; }
.rl-phone-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #ececf0; font-weight: 700; }
.rl-phone-logo { width: 30px; height: 30px; border-radius: 50%; flex: none; object-fit: cover; background: var(--rl-accent, #164B1E); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
.rl-phone-body { padding: 12px; }
.rl-phone-title { font-weight: 800; font-size: 15px; margin: 0 0 2px; overflow-wrap: anywhere; }
.rl-phone-sub { color: #6b7280; font-size: 12px; margin: 0 0 10px; }
.rl-phone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rl-phone-grid .rl-name { font-size: 12px; margin-top: 4px; line-height: 1.3; }
.rl-phone-grid .rl-price { font-weight: 800; font-size: 12.5px; }
.rl-phone-grid .gone img, .rl-phone-grid .gone .rl-thumb-empty { filter: grayscale(1) opacity(.55); }
.rl-share { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 22px; align-items: start; }
.rl-where { border-top: 1px solid var(--border-light); }
.rl-where div { padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.rl-where p { margin: 2px 0 0; color: var(--text-secondary); font-size: 13px; }
.rl-qr { background: #fff; padding: 10px; border-radius: 10px; border: 1px solid var(--border-light); display: inline-block; }
.rl-dialog-opt { display: flex; gap: 12px; align-items: flex-start; padding: 12px 4px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.rl-dialog-opt:last-child { border-bottom: 0; }
.rl-dialog-opt input { margin-top: 3px; width: 18px; height: 18px; accent-color: var(--brand-solid); }
@media (max-width: 980px) { .rl-two, .rl-share { grid-template-columns: 1fr; } .rl-phone { max-width: 320px; } }
@media (max-width: 640px) {
  .rl-table thead { display: none; }
  .rl-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; padding: 12px 4px; border-bottom: 1px solid var(--border-light); }
  .rl-table td { border: 0; padding: 0; }
  .rl-table td.rl-hide-phone { display: none; }
  .rl-piece { grid-template-columns: 44px minmax(0, 1fr); }
  .rl-piece .rl-piece-colour, .rl-piece .rl-order { grid-column: 2; }
  .btn-primary, .btn-secondary { min-height: 42px; }
}
`;
