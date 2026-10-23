import React from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
// Whole rupees: a filter says "₹5,000 to ₹15,000", not "₹5,000.00 to ₹15,000.00".
const formatRupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * The Products page's filter bar: one button per filter, each opening a short list with how many
 * products every choice would leave (worked out on the server with the other filters on), the
 * choices made as chips underneath, and the sort.
 *
 * App buttons, not the browser's dropdowns: these hold counts, swatches and ticks, and on a phone
 * they open as a sheet from the bottom of the screen.
 */

export const FILTERS = [
  { k: 'type', label: 'Type' },
  { k: 'colour', label: 'Colour' },
  { k: 'price', label: 'Price' },
  { k: 'fabric', label: 'Fabric' },
  { k: 'craft', label: 'Craft' },
  { k: 'brand', label: 'Brand' },
  { k: 'stock', label: 'Stock' },
  { k: 'photos', label: 'Photos' }
];
export const LIST_KEYS = FILTERS.filter(f => f.k !== 'price').map(f => f.k);

const NAMES = {
  stock: { in: 'In stock', low: 'Running low', out: 'Sold out' },
  photos: { with: 'Has photos', without: 'No photos yet' }
};
export const optionLabel = (k, v) => (v === '__none' ? 'Not set' : NAMES[k]?.[v] ?? v);

export const SORTS = {
  new: 'Newest first', old: 'Oldest first', plo: 'Price: low to high', phi: 'Price: high to low',
  qhi: 'Most in stock', qlo: 'Least in stock', az: 'Name A to Z'
};

// The colour families (customer-card/colours on the server), drawn as a dot each.
const FAMILY = {
  Pink: '#E0559A', Orange: '#F08A3C', Red: '#B3263A', Gold: '#C9A227', Yellow: '#E8C547', Green: '#3E9B4F',
  Blue: '#2F5DA8', Purple: '#7A4BA8', Brown: '#8B5E3C', White: '#F4F1E8', Grey: '#9AA0A6', Black: '#1F1F1F',
  Multicolour: 'conic-gradient(#e0559a, #f08a3c, #e8c547, #3e9b4f, #2f5da8, #7a4ba8, #e0559a)'
};
const swatch = (name) => {
  if (FAMILY[name]) return FAMILY[name];
  // A colour no family rule knows stays as typed; web names like "Goldenrod" still draw.
  const css = String(name || '').replace(/\s+/g, '').toLowerCase();
  return typeof CSS !== 'undefined' && CSS.supports?.('color', css) ? css : 'var(--bg-input)';
};

function useOutside(open, close) {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onDown = (e) => { if (!e.target.closest?.('[data-pf-keep]')) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open, close]);
}

function Menu({ label, children, align }) {
  return (
    <>
      <div className="pf-backdrop" aria-hidden="true" />
      <div className={`pf-pop${align === 'right' ? ' right' : ''}`} role="menu" aria-label={label} data-pf-keep>
        <div className="pf-sheet-head"><b>{label}</b></div>
        {children}
      </div>
    </>
  );
}

export default function ProductFilters({ facets, value, onChange }) {
  const [open, setOpen] = React.useState(null);
  const close = React.useCallback(() => setOpen(null), []);
  useOutside(open, close);
  if (!facets) return null;

  const toggle = (k, v) => {
    const now = new Set(value[k] ?? []);
    now.has(v) ? now.delete(v) : now.add(v);
    onChange({ ...value, [k]: [...now] });
  };
  const price = facets.price ?? {};
  const priceOn = value.min !== undefined || value.max !== undefined;

  return (
    <div className="pf-bar" role="group" aria-label="Filter products">
      {FILTERS.map(({ k, label }) => {
        if (k === 'price') {
          if (!(price.hi > price.lo) && !priceOn) return null;
        } else {
          const options = facets[k] ?? [];
          // A filter with one choice for this whole shop filters nothing: left out until it could.
          if (options.length < 2 && !(value[k]?.length)) return null;
        }
        const n = k === 'price' ? (priceOn ? 1 : 0) : (value[k]?.length ?? 0);
        return (
          <span key={k} className="pf-btn" data-pf-keep>
            <button type="button" className={n ? 'on' : ''} aria-expanded={open === k} aria-haspopup="menu"
              onClick={() => setOpen(open === k ? null : k)}>
              {label}{n > 0 && <span className="pf-n">{n}</span>}<ChevronDown size={14} aria-hidden="true" />
            </button>
            {open === k && k !== 'price' && (
              <Menu label={label}>
                {(facets[k] ?? []).map(({ value: v, count }) => {
                  const on = (value[k] ?? []).includes(v);
                  return (
                    <button key={v} type="button" role="menuitemcheckbox" aria-checked={on} className="pf-opt"
                      disabled={count === 0 && !on} onClick={() => toggle(k, v)}>
                      <span className="pf-box">{on && <Check size={12} />}</span>
                      <span className="pf-name">
                        {k === 'colour' && <span className="pf-sw" style={{ background: swatch(v) }} />}
                        {optionLabel(k, v)}
                      </span>
                      <span className="pf-count">{count}</span>
                    </button>
                  );
                })}
              </Menu>
            )}
            {open === 'price' && k === 'price' && (
              <Menu label="Price">
                {(price.bands ?? []).map(b => {
                  const on = (value.min ?? null) === b.min && (value.max ?? null) === b.max;
                  const text = b.min == null ? `Under ${formatRupees(b.max)}` : b.max == null ? `Above ${formatRupees(b.min)}` : `${formatRupees(b.min)} to ${formatRupees(b.max)}`;
                  return (
                    <button key={text} type="button" role="menuitemradio" aria-checked={on} className="pf-opt"
                      disabled={b.count === 0 && !on}
                      onClick={() => onChange({ ...value, min: on ? undefined : b.min ?? undefined, max: on ? undefined : b.max ?? undefined })}>
                      <span className="pf-box">{on && <Check size={12} />}</span><span className="pf-name">{text}</span><span className="pf-count">{b.count}</span>
                    </button>
                  );
                })}
                <PriceBoxes value={value} span={price} onChange={onChange} />
              </Menu>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** From / To in rupees, applied when the box is left or Enter is pressed. */
function PriceBoxes({ value, span, onChange }) {
  const [from, setFrom] = React.useState(value.min ?? '');
  const [to, setTo] = React.useState(value.max ?? '');
  const apply = () => {
    const n = (x) => (String(x).trim() === '' ? undefined : Math.max(0, Number(String(x).replace(/[^\d.]/g, '')) || 0));
    onChange({ ...value, min: n(from), max: n(to) });
  };
  return (
    <div className="pf-prices">
      <label htmlFor="pf-from">From ₹<input id="pf-from" inputMode="numeric" value={from} placeholder={String(Math.floor(span.lo ?? 0))}
        onChange={(e) => setFrom(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
      <label htmlFor="pf-to">To ₹<input id="pf-to" inputMode="numeric" value={to} placeholder={String(Math.ceil(span.hi ?? 0))}
        onChange={(e) => setTo(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
    </div>
  );
}

/** The choices made, each with a ✕, and Clear all. */
export function ActiveFilters({ value, onChange, onClearAll }) {
  const chips = [];
  for (const { k, label } of FILTERS) {
    if (k === 'price') {
      if (value.min !== undefined || value.max !== undefined) {
        chips.push({ key: 'price', text: `Price: ${value.min !== undefined ? formatRupees(value.min) : 'any'} to ${value.max !== undefined ? formatRupees(value.max) : 'any'}`, drop: () => onChange({ ...value, min: undefined, max: undefined }) });
      }
      continue;
    }
    for (const v of value[k] ?? []) chips.push({ key: `${k}:${v}`, text: `${label}: ${optionLabel(k, v)}`, drop: () => onChange({ ...value, [k]: value[k].filter(x => x !== v) }) });
  }
  if (!chips.length && !value.q) return null;
  return (
    <div className="pf-active">
      {chips.map(c => (
        <button key={c.key} type="button" className="pf-chip" onClick={c.drop} aria-label={`Remove ${c.text}`}>
          {c.text}<X size={13} aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="pf-clear" onClick={onClearAll}>Clear all</button>
    </div>
  );
}

/** "Sort: Newest first", a short menu. */
export function SortMenu({ sort, onChange }) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  useOutside(open, close);
  return (
    <span className="pf-btn" data-pf-keep>
      <button type="button" className="pf-sort" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        Sort: {SORTS[sort] ?? SORTS.new}<ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <Menu label="Sort" align="right">
          {Object.entries(SORTS).map(([k, l]) => (
            <button key={k} type="button" role="menuitemradio" aria-checked={k === sort} className="pf-opt" onClick={() => { onChange(k); setOpen(false); }}>
              <span className="pf-box">{k === sort && <Check size={12} />}</span><span className="pf-name">{l}</span><span />
            </button>
          ))}
        </Menu>
      )}
    </span>
  );
}
