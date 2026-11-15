import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import Select from '../../components/common/Select';
import { useGoBack } from '../../hooks/useGoBack';
import { qtyShown } from '../../lib/units';

/**
 * Shared by the four full pages behind the dashboard cards (Sales, Stock value, Stock on hand, Running low).
 * The look is the dashboard's own (its cards, the till/online colours), so a page reads as its card, opened up.
 * Filters live in the address, so Back, a refresh or a shared link shows the same view.
 *
 * Phones get their own layouts (useIsPhone), not a squeezed desktop table: every list has a phone row designed for
 * a 360-px screen, controls are at least 42 px tall, and long amounts switch to crore / lakh.
 */

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
/** Compact money: ₹8.57 Cr, ₹4.5 L, ₹50k, ₹800. */
export const shortRupees = (n) => {
  const v = Math.abs(Number(n) || 0), sign = n < 0 ? '-' : '';
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (v >= 1e3) return `${sign}₹${Math.round(v / 1e3)}k`;
  return `${sign}₹${Math.round(v)}`;
};
export const share = (part, whole) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0);

/** True on a phone-width screen; follows rotation and resizing. */
export function useIsPhone(max = 640) {
  const query = `(max-width: ${max}px)`;
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on); on();
    return () => m.removeEventListener('change', on);
  }, [query]);
  return phone;
}

/** An amount in full, or in crore on a phone when the full figure would not fit. The full figure stays in the title. */
export function Money({ value, compact }) {
  const full = rupees(value);
  return compact && Math.abs(value) >= 1e7 ? <span title={full}>{shortRupees(value)}</span> : <>{full}</>;
}

/** Pieces, metres and kilograms of one row, as one short phrase: "768 pieces · 112.00 m". */
export function amountText({ pieces = 0, fabricCm = 0, weightG = 0 }) {
  const bits = [];
  if (pieces || (!fabricCm && !weightG)) bits.push(`${Number(pieces).toLocaleString('en-IN')} ${pieces === 1 ? 'piece' : 'pieces'}`);
  if (fabricCm) bits.push(qtyShown(fabricCm, 'METRE'));
  if (weightG) bits.push(qtyShown(weightG, 'KILOGRAM'));
  return bits.join(' · ');
}

/** One of the four pages' data, refetched as the filters change, the last figures kept on screen meanwhile. */
export function useAnalytics(path, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['analytics', path, params],
    queryFn: async () => (await api.get(`/analytics/${path}`, { params })).data,
    enabled, placeholderData: keepPreviousData, staleTime: 60 * 1000, retry: 1
  });
}

/** Filters kept in the address (?store=…&period=…). */
export function useFilters(defaults) {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) ?? defaults[k] ?? '';
  const set = (patch) => setParams(prev => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v === '' || v == null || v === defaults[k]) next.delete(k); else next.set(k, v); }
    return next;
  }, { replace: true });
  return [get, set];
}

/** Back, the breadcrumb and the title; the page's filters sit in a toolbar beside it (below it on a phone). */
export function PageHead({ title, subtitle, children }) {
  const goBack = useGoBack('/');
  return (
    <header className="an-head">
      <div className="an-title">
        <nav className="an-crumb" aria-label="Breadcrumb">
          <button type="button" className="an-back" onClick={goBack} aria-label="Back"><ArrowLeft size={16} /></button>
          <Link to="/">Dashboard</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span>
        </nav>
        <h1>{title}</h1>
        {subtitle && <p className="an-sub">{subtitle}</p>}
      </div>
      {children && <div className="an-tools" role="toolbar" aria-label="Filters">{children}</div>}
    </header>
  );
}

/** "All stores" and every store; an inactive store is marked as such. */
export function StorePick({ stores, value, onChange, allLabel = 'All stores' }) {
  return (
    <Select className="an-select" aria-label="Store" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">{allLabel}</option>
      {stores.map(s => <option key={s.id} value={s.id}>{s.name}{s.active === false ? ' (inactive)' : ''}</option>)}
    </Select>
  );
}

/** A segmented control; on a phone it scrolls sideways inside itself rather than wrapping onto two lines. */
export function Seg({ label, options, value, onChange }) {
  return (
    <div className="an-seg-wrap">
      <div className="ov-seg an-seg" role="group" aria-label={label}>
        {options.map(o => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, note, tone }) {
  return (
    <div className="an-stat">
      <div className="an-stat-l">{label}</div>
      <div className={`an-stat-v${tone ? ` ${tone}` : ''}`}>{value}</div>
      <div className="an-stat-n">{note ?? ' '}</div>
    </div>
  );
}

export function Bar({ value, tone = 'till', label }) {
  return (
    <span className="an-bar" role="img" aria-label={label ?? `${Math.round(value)}%`}>
      <span style={{ width: `${Math.max(value > 0 ? 2 : 0, value)}%`, background: tone === 'online' ? 'var(--ov-online)' : 'var(--ov-till)' }} />
    </span>
  );
}

/** A small marker beside a name ("Current store", "Inactive"). */
export const Tag = ({ children, tone }) => <span className={`an-tag${tone ? ` ${tone}` : ''}`}>{children}</span>;

export function Loading() {
  return (
    <div className="an-grid4" aria-busy="true" aria-label="Loading the figures">
      {[0, 1, 2, 3].map(i => <div key={i} className="an-stat"><span className="ov-skel" style={{ height: 12, width: '60%' }} /><span className="ov-skel" style={{ height: 24, width: '80%', marginTop: 8 }} /></div>)}
    </div>
  );
}

/** A refusal in its own words (a bad date, a store that is gone); anything else as one plain sentence. */
export function Problem({ error, onRetry }) {
  const status = error?.response?.status ?? error?.status;
  const said = error?.response?.data?.message ?? error?.message;
  const text = status && status < 500 && said ? said : 'Unable to load this report. Please try again.';
  return (
    <div className="ov-card an-problem" role="alert">
      <span>{text}</span>
      {(!status || status >= 500) && <button type="button" className="btn-secondary" onClick={onRetry}><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}

export const AN_CSS = `
.an { display: grid; gap: 16px; min-width: 0; }
.an-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.an-title { min-width: 0; }
.an-head h1 { margin: 6px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: var(--text-primary); line-height: 1.15; }
.an-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }
.an-crumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); }
.an-crumb a { color: var(--text-secondary); text-decoration: none; display: inline-flex; align-items: center; min-height: 32px; }
.an-crumb a:hover { color: var(--text-primary); text-decoration: underline; text-underline-offset: 3px; }
.an-back { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); cursor: pointer; }
.an-back:hover { border-color: var(--text-muted); }
.an-tools { display: flex; gap: 10px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
.an-tools > * { flex: 0 0 auto; }
.an-tools .an-select, .an-tools .custom-select-container.an-select { width: 230px; }
.an-select .custom-select-trigger { padding: 8px 12px; font-size: 13px; min-height: 38px; border-radius: 10px; background: var(--bg-card); }
.an-seg-wrap { max-width: 100%; }
.an-seg { white-space: nowrap; }
.an-seg button { padding: 7px 12px; min-height: 32px; }
.an-grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.an-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.an-stat { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 14px; padding: 14px 16px; display: grid; gap: 4px; align-content: start; min-width: 0; }
.an-stat-l { font-size: 12.5px; color: var(--text-secondary); font-weight: 600; }
.an-stat-v { font-size: 24px; font-weight: 800; letter-spacing: -.02em; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-stat-v.warn { color: var(--accent-warning); } .an-stat-v.bad { color: var(--accent-danger); }
.an-stat-n { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.an-up { color: var(--accent-success); } .an-down { color: var(--accent-danger); }
.an-card-h { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.an-card-h h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.an-card-h .sp { flex: 1; }
.an-bar { display: block; height: 8px; border-radius: 4px; background: var(--ov-track); overflow: hidden; min-width: 40px; }
.an-bar > span { display: block; height: 100%; border-radius: 4px; }
.an-tag { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--ov-soft); color: var(--text-primary); vertical-align: 1px; white-space: nowrap; }
.an-tag.muted { background: var(--bg-input); color: var(--text-muted); }
.an-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.an-table th { text-align: left; font-size: 12px; font-weight: 600; color: var(--text-muted); padding: 8px 10px; border-bottom: 1px solid var(--border-light); white-space: nowrap; }
.an-table td { padding: 11px 10px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); vertical-align: middle; }
.an-table tr:last-child td { border-bottom: 0; }
.an-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.an-table tr.mine td:first-child { box-shadow: inset 3px 0 0 var(--ov-till); }
.an-table tr.go { cursor: pointer; } .an-table tr.go:hover td { background: var(--bg-hover, rgba(0,0,0,.03)); }
.an-table tr.go:focus-visible td { outline: none; background: var(--ov-soft); }
.an-list { display: grid; gap: 10px; }
.an-li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; font-size: 13.5px; }
.an-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary); }
.an-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: 0; }
.an-problem { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; color: var(--text-primary); }
.an-empty { text-align: center; padding: 36px 12px; color: var(--text-muted); font-size: 14px; margin: 0; }
.an-more { background: none; border: 0; color: var(--text-secondary); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 10px 0 0; text-decoration: underline; text-underline-offset: 3px; min-height: 36px; }
.an-dates { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.an-dates label { font-size: 12.5px; color: var(--text-secondary); font-weight: 600; }
.an-dates input { padding: 7px 10px; font-size: 13px; min-height: 38px; }
.an-err { color: var(--accent-danger); font-size: 12.5px; }
.an-note { margin: 0; font-size: 12px; color: var(--text-muted); }
.an-rows { display: grid; }
.an-row { display: grid; gap: 6px; padding: 14px 0; border-bottom: 1px solid var(--border-light); }
.an-row:first-child { padding-top: 2px; } .an-row:last-child { border-bottom: 0; padding-bottom: 2px; }
.an-row.mine { box-shadow: inset 3px 0 0 var(--ov-till); padding-left: 12px; }
.an-row-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.an-row-name { font-weight: 700; color: var(--text-primary); min-width: 0; overflow-wrap: anywhere; text-decoration: none; display: inline-block; padding: 4px 0; }
a.an-row-name:hover { text-decoration: underline; text-underline-offset: 3px; }
.an-row-fig { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--text-primary); }
.an-row-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2px 12px; font-size: 12.5px; color: var(--text-muted); }
.an-row-meta > span { white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.an-row .btn-secondary { width: 100%; min-height: 42px; margin-top: 4px; justify-content: center; }
button.an-row-name { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; text-align: left; cursor: pointer; min-height: 40px; }
.an-link { display: inline-flex; align-items: center; min-height: 28px; padding: 0 2px; font-weight: 600; }
@media (max-width: 1100px) { .an-head { align-items: stretch; } .an-tools { justify-content: flex-start; } }
@media (max-width: 900px) { .an-grid4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .an-grid2 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
  .an { gap: 14px; }
  .an-head { gap: 12px; }
  .an-head h1 { font-size: 22px; }
  .an-tools { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .an-seg-wrap { overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px; }
  .an-seg-wrap::-webkit-scrollbar { display: none; }
  .an-seg { display: inline-flex; }
  .an-seg button { min-height: 40px; padding: 8px 14px; }
  .an-tools .an-select, .an-tools .custom-select-container.an-select { width: 100%; }
  .an-select .custom-select-trigger { min-height: 44px; font-size: 14px; }
  .an-more { min-height: 44px; }
  .an-grid4 { gap: 10px; }
  .an-stat { padding: 12px 14px; border-radius: 12px; }
  .an-stat-v { font-size: 20px; }
  .an-dates { display: grid; grid-template-columns: auto minmax(0, 1fr); }
  .an-dates input { min-height: 44px; width: 100%; }
  .an-dates .btn-secondary { grid-column: 1 / -1; min-height: 44px; justify-content: center; }
  .ov-card { padding: 14px; border-radius: 16px; }
}
`;
