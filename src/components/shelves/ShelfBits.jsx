import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ScanLine, Loader2, X, Minus, Plus, MapPin, Search, PackagePlus, ArrowRightLeft, TriangleAlert, Settings2, ClipboardList, ClipboardCheck, Map as MapIcon } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useLocationContext } from '../../contexts/LocationContext';
import { useShelfIssues } from '../../hooks/useShelves';

/**
 * The pieces every shelves screen shares: the header with its tabs, the scan box, the address chip,
 * the item thumbnail, the quantity stepper. Styled once here (sh-*), so the screens stay about what
 * they do.
 */

export const SHELF_CSS = `
  .sh-page { width: 100%; box-sizing: border-box; padding: clamp(12px, 3.5vw, 28px) 0; max-width: 1200px; margin: 0 auto; display: grid; gap: 18px; align-content: start; }
  .sh-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .sh-head h1 { font-size: clamp(22px, 3vw, 28px); margin: 0; display: flex; align-items: center; gap: 10px; }
  .sh-head p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
  .sh-loc { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--bg-input); border: 1px solid var(--border-light); font-size: 13px; color: var(--text-secondary); }
  .sh-loc strong { color: var(--text-primary); font-weight: 600; }
  .sh-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; border-bottom: 1px solid var(--border-light); }
  .sh-tabs::-webkit-scrollbar { display: none; }
  .sh-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px 10px 0 0; color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 500; white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .sh-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
  .sh-tab.active { color: var(--text-primary); border-bottom-color: var(--accent-primary); font-weight: 600; }
  .sh-count { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--accent-warning); color: #111; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
  .sh-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: clamp(14px, 2.4vw, 20px); }
  .sh-scan { position: relative; }
  .sh-scan input { width: 100%; height: 56px; font-size: 17px; padding: 0 48px 0 50px; border-radius: 14px; }
  .sh-scan .sh-scan-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
  .sh-scan .sh-scan-end { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; align-items: center; color: var(--text-muted); }
  .sh-iconbtn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; }
  .sh-iconbtn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .sh-addr { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-weight: 700; letter-spacing: .02em; }
  .sh-chip { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-light); font-size: 13px; }
  .sh-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; border: 1px solid var(--border-focus); }
  .sh-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  .sh-tag.floor { background: rgba(16,185,129,.12); color: var(--accent-success); }
  .sh-tag.back { background: rgba(245,158,11,.14); color: var(--accent-warning); }
  .sh-tag.muted { background: var(--bg-input); color: var(--text-muted); }
  .sh-thumb { border-radius: 10px; background: var(--bg-input); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
  .sh-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .sh-stepper { display: inline-flex; align-items: center; border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; background: var(--bg-input); }
  .sh-stepper button { width: 44px; height: 44px; border: none; background: transparent; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .sh-stepper button:disabled { opacity: .35; cursor: default; }
  .sh-stepper input { width: 64px; height: 44px; text-align: center; border: none; background: transparent; color: var(--text-primary); font-size: 17px; font-weight: 700; -moz-appearance: textfield; }
  .sh-stepper input::-webkit-outer-spin-button, .sh-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .sh-empty { text-align: center; padding: clamp(28px, 6vw, 56px) 16px; color: var(--text-secondary); display: grid; gap: 10px; justify-items: center; }
  .sh-empty h3 { margin: 0; color: var(--text-primary); font-size: 17px; }
  .sh-empty p { margin: 0; max-width: 440px; font-size: 14px; }
  .sh-row { display: flex; align-items: center; gap: 12px; }
  .sh-page .btn-secondary, .sh-page .btn-primary { white-space: nowrap; }
  .sh-muted { color: var(--text-secondary); font-size: 13px; }
  .sh-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
  .sh-split { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 18px; align-items: start; }
  .sh-big-qty { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .sh-list-btn { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid transparent; background: transparent; color: var(--text-primary); cursor: pointer; }
  .sh-list-btn:hover { background: var(--bg-hover); }
  .sh-list-btn.selected { background: var(--bg-hover); border-color: var(--border-focus); }
  .sh-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin: 0 0 8px; }
  @media (max-width: 860px) {
    .sh-grid-2, .sh-split { grid-template-columns: minmax(0, 1fr); }
  }
  @media print { .sh-noprint { display: none !important; } }
`;

export function ShelfStyles() {
  return <style>{SHELF_CSS}</style>;
}

const TABS = [
  { to: '/shelves', label: 'Where is it?', icon: Search, permission: 'shelf:view', end: true },
  { to: '/shelves/put-away', label: 'Put away', icon: PackagePlus, permission: 'shelf:putaway' },
  { to: '/shelves/move', label: 'Move', icon: ArrowRightLeft, permission: 'shelf:putaway' },
  { to: '/shelves/pick', label: 'Pick', icon: ClipboardList, permission: 'shelf:putaway' },
  { to: '/shelves/count', label: 'Count', icon: ClipboardCheck, permission: 'shelf:putaway' },
  { to: '/shelves/map', label: 'Map', icon: MapIcon, permission: 'shelf:view' },
  { to: '/shelves/issues', label: 'Shelf issues', icon: TriangleAlert, permission: 'shelf:view', badge: true },
  { to: '/shelves/setup', label: 'Racks & shelves', icon: Settings2, permission: 'shelf:manage' }
];

/** Header, current location and tabs for every shelves screen. */
export function ShelvesLayout({ title, subtitle, icon: Icon, actions, children, needsLocation = true }) {
  const { can } = usePermission();
  const { currentLocation } = useLocationContext();
  const issues = useShelfIssues('OPEN', currentLocation?.id, 1);
  const open = issues.data?.open ?? 0;
  return (
    <div className="sh-page">
      <ShelfStyles />
      <div className="sh-head">
        <div style={{ minWidth: 0 }}>
          <h1>{Icon && <Icon size={26} />} {title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="sh-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {currentLocation && (
            <span className="sh-loc" title="Change the location in the top bar">
              <MapPin size={14} /> <strong>{currentLocation.name}</strong>
            </span>
          )}
          {actions}
        </div>
      </div>
      <nav className="sh-tabs sh-noprint" aria-label="Shelves">
        {TABS.filter(t => can(t.permission)).map(t => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `sh-tab${isActive ? ' active' : ''}`}>
            <t.icon size={16} /> {t.label}
            {t.badge && open > 0 && <span className="sh-count" aria-label={`${open} open`}>{open > 99 ? '99+' : open}</span>}
          </NavLink>
        ))}
      </nav>
      {needsLocation && !currentLocation ? (
        <div className="sh-card">
          <EmptyState icon={MapPin} title="Choose a location" text="Pick the store or godown you are working in from the top bar." />
        </div>
      ) : children}
    </div>
  );
}

/**
 * One box for a scanner and for typing. A scanner types fast and presses Enter, so Enter hands the
 * text over at once; typing is also passed on as it changes for live search.
 */
export const ScanInput = forwardRef(function ScanInput({ value, onChange, onSubmit, placeholder, busy, autoFocus = true, label = 'Scan or search', clearOnSubmit = false }, ref) {
  const inner = useRef(null);
  const input = ref || inner;
  // Some scanners send Enter twice in the same instant. The box is cleared through React state,
  // which has not redrawn yet, so the second Enter reads the same text and counts the same piece
  // again. Two real scans are never this close together (a person cannot be), so the twin is
  // dropped. 60ms is far below a genuine repeat and far above one screen redraw.
  const lastSubmit = useRef({ text: '', at: 0 });
  return (
    <div className="sh-scan">
      <ScanLine size={22} className="sh-scan-icon" />
      <input
        ref={input}
        className="input-field"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-label={label}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const text = value.trim();
            const now = Date.now();
            if (text && !(lastSubmit.current.text === text && now - lastSubmit.current.at < 60)) {
              lastSubmit.current = { text, at: now };
              onSubmit?.(text);
              if (clearOnSubmit) onChange('');
            }
          } else if (e.key === 'Escape' && value) {
            onChange('');
          }
        }}
      />
      <div className="sh-scan-end">
        {busy && <Loader2 size={18} className="animate-spin" />}
        {value && (
          <button type="button" className="sh-iconbtn" aria-label="Clear" onClick={() => { onChange(''); input.current?.focus(); }}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
});

export function SpotChip({ address, name, colour, isShopFloor, size = 'md', showTag = true }) {
  const big = size === 'lg';
  return (
    <span className="sh-row" style={{ gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
      {colour && <span className="sh-dot" style={{ background: colour }} title={colour} />}
      <span className="sh-addr" style={{ fontSize: big ? 20 : 14 }}>{address}</span>
      {name && <span className="sh-muted" style={{ fontSize: big ? 14 : 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>}
      {showTag && isShopFloor !== undefined && (
        <span className={`sh-tag ${isShopFloor ? 'floor' : 'back'}`}>{isShopFloor ? 'Shop floor' : 'Back room'}</span>
      )}
    </span>
  );
}

export function ItemThumb({ url, size = 48, label }) {
  return (
    <div className="sh-thumb" style={{ width: size, height: size }} aria-hidden={!label}>
      {url ? <img src={url} alt={label || ''} loading="lazy" /> : <span style={{ fontSize: size / 3 }}>👗</span>}
    </div>
  );
}

export const itemDetail = (it) => [it.colorName, it.size && it.size !== 'Free' ? `Size ${it.size}` : it.size, it.sku].filter(Boolean).join(' · ');

export function Stepper({ value, onChange, min = 1, max = 100000, label = 'Quantity' }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (raw) => {
    const n = Math.floor(Number(raw));
    const next = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
    onChange(next);
    setText(String(next));
  };
  return (
    <div className="sh-stepper" role="group" aria-label={label}>
      <button type="button" aria-label="One fewer" disabled={value <= min} onClick={() => commit(value - 1)}><Minus size={18} /></button>
      <input type="number" inputMode="numeric" value={text} min={min} max={max} aria-label={label}
        onChange={(e) => {
          setText(e.target.value);
          // A whole number in range counts at once, so scanning a shelf right after typing uses it.
          // Anything else (empty, 0, minus, half a piece) is reported as 0: the box and what the
          // screen is about to do must never disagree -- typing 0 and scanning a shelf used to put
          // one piece away, because the last good number was still being held here.
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isInteger(n) && n >= min && n <= max) onChange(n);
          else onChange(0);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); } }} />
      <button type="button" aria-label="One more" disabled={value >= max} onClick={() => commit(value + 1)}><Plus size={18} /></button>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="sh-empty">
      {Icon && <Icon size={40} strokeWidth={1.5} />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const pieces = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;
