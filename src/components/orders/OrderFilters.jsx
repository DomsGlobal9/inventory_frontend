import React from 'react';
import { ChevronDown, Check, X, CalendarDays } from 'lucide-react';
import { Menu, useOutside } from '../products/ProductFilters';
import { ORDER_STATUS } from '../sales/labels';

/**
 * The Orders page's filter bar, in the Products page's look (pf-* in index.css): one button per
 * filter, each choice with how many orders it would leave (worked out on the server with the other
 * filters on), the choices made as chips underneath, and the sort.
 *
 * The date is its own menu: a few quick ranges a shop actually asks for ("this month", "yesterday")
 * and two date boxes for anything else. Days are India's days (the server's startOfDay).
 */

const formatRupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const LIST_KEYS = ['status', 'payment', 'source', 'kept', 'store'];
const LABELS = { status: 'Status', payment: 'Payment', source: 'Where from', kept: 'Kept orders', store: 'Store' };

const NAMES = {
  status: Object.fromEntries(Object.entries(ORDER_STATUS).map(([k, s]) => [k, s.label])),
  payment: { PAID: 'Paid', PART_PAID: 'Part paid', UNPAID: 'Not paid', WRITTEN_OFF: 'Written off', REFUNDED: 'Refunded' },
  source: { TILL: 'POS till', ONLINE_SHOP: 'Online shop', SHOPIFY: 'Shopify', COUNTER: 'Counter (before 6 Oct)', MANUAL: 'Typed in' },
  kept: { WAITING: 'Waiting for collection', OVERDUE: 'Past the promised date', HANDED_OVER: 'Handed over' }
};
// The order each list is shown in: the way a shop thinks of them, not by count.
const ORDER = {
  payment: ['UNPAID', 'PART_PAID', 'PAID', 'WRITTEN_OFF', 'REFUNDED'],
  source: ['TILL', 'ONLINE_SHOP', 'SHOPIFY', 'COUNTER', 'MANUAL'],
  kept: ['WAITING', 'OVERDUE', 'HANDED_OVER'],
  status: Object.keys(ORDER_STATUS)
};

export const SORTS = { new: 'Newest first', old: 'Oldest first', thi: 'Amount: high to low', tlo: 'Amount: low to high', due: 'Most due first' };

/** India's today, and a day n days before it, as YYYY-MM-DD. */
const indiaDay = (back = 0) => new Date(Date.now() + 330 * 60_000 - back * 86_400_000).toISOString().slice(0, 10);
const PRESETS = () => {
  const today = indiaDay();
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const lastMonthEnd = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, 0)).toISOString().slice(0, 10);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: indiaDay(1), to: indiaDay(1) },
    { label: 'Last 7 days', from: indiaDay(6), to: today },
    { label: 'Last 30 days', from: indiaDay(29), to: today },
    { label: 'This month', from: firstOfMonth, to: today },
    { label: 'Last month', from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd }
  ];
};
const shortDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.slice(0, 4) === indiaDay().slice(0, 4) ? undefined : 'numeric' });
export const dateLabel = (from, to) => {
  if (!from && !to) return null;
  const preset = PRESETS().find(p => p.from === from && p.to === to);
  if (preset) return preset.label;
  if (from && to) return from === to ? shortDay(from) : `${shortDay(from)} to ${shortDay(to)}`;
  return from ? `From ${shortDay(from)}` : `Up to ${shortDay(to)}`;
};

export const optionLabel = (k, v, facets) =>
  k === 'store' ? (facets?.store?.find(o => o.value === v)?.label ?? 'Store') : NAMES[k]?.[v] ?? v;

const AMOUNT_BANDS = { '-1000': 'Under ₹1,000', '1000-5000': '₹1,000 to ₹5,000', '5000-20000': '₹5,000 to ₹20,000', '20000-': 'Above ₹20,000' };

export default function OrderFilters({ facets, value, onChange }) {
  const [open, setOpen] = React.useState(null);
  const close = React.useCallback(() => setOpen(null), []);
  useOutside(open, close);
  if (!facets) return null;

  const toggle = (k, v) => {
    const now = new Set(value[k] ?? []);
    now.has(v) ? now.delete(v) : now.add(v);
    onChange({ ...value, [k]: [...now] });
  };
  const dateOn = Boolean(value.from || value.to);
  const amountOn = value.min !== undefined || value.max !== undefined;
  const sorted = (k) => {
    const list = facets[k] ?? [];
    const rank = ORDER[k];
    return rank ? [...list].sort((a, b) => rank.indexOf(a.value) - rank.indexOf(b.value)) : [...list].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  };

  const button = (k, label, n, Icon) => (
    <button type="button" className={n ? 'on' : ''} aria-expanded={open === k} aria-haspopup="menu" onClick={() => setOpen(open === k ? null : k)}>
      {Icon && <Icon size={14} aria-hidden="true" />}{label}{n > 0 && <span className="pf-n">{n}</span>}<ChevronDown size={14} aria-hidden="true" />
    </button>
  );

  return (
    <div className="pf-bar" role="group" aria-label="Filter orders">
      <span className="pf-btn" data-pf-keep>
        {button('date', dateOn ? dateLabel(value.from, value.to) : 'Any date', dateOn ? 1 : 0, CalendarDays)}
        {open === 'date' && (
          <Menu label="Date" onClose={close}>
            {PRESETS().map(p => {
              const on = value.from === p.from && value.to === p.to;
              return (
                <button key={p.label} type="button" role="menuitemradio" aria-checked={on} className="pf-opt"
                  onClick={() => { onChange({ ...value, from: on ? undefined : p.from, to: on ? undefined : p.to }); close(); }}>
                  <span className="pf-box">{on && <Check size={12} />}</span><span className="pf-name">{p.label}</span><span />
                </button>
              );
            })}
            <DateBoxes value={value} onChange={onChange} />
          </Menu>
        )}
      </span>

      {LIST_KEYS.map(k => {
        const options = sorted(k);
        // A filter with one choice for this whole shop filters nothing: left out until it could.
        if (options.length < 2 && !(value[k]?.length)) return null;
        const n = value[k]?.length ?? 0;
        return (
          <span key={k} className="pf-btn" data-pf-keep>
            {button(k, LABELS[k], n)}
            {open === k && (
              <Menu label={LABELS[k]} onClose={close}>
                {options.map(({ value: v, count }) => {
                  const on = (value[k] ?? []).includes(v);
                  return (
                    <button key={v} type="button" role="menuitemcheckbox" aria-checked={on} className="pf-opt"
                      disabled={count === 0 && !on} onClick={() => toggle(k, v)}>
                      <span className="pf-box">{on && <Check size={12} />}</span>
                      <span className="pf-name">{optionLabel(k, v, facets)}</span>
                      <span className="pf-count">{count}</span>
                    </button>
                  );
                })}
              </Menu>
            )}
          </span>
        );
      })}

      <span className="pf-btn" data-pf-keep>
        {button('amount', 'Amount', amountOn ? 1 : 0)}
        {open === 'amount' && (
          <Menu label="Amount" onClose={close}>
            {(facets.amount ?? []).map(b => {
              const [lo, hi] = b.value.split('-').map(x => (x === '' ? undefined : Number(x)));
              const on = value.min === lo && value.max === hi;
              return (
                <button key={b.value} type="button" role="menuitemradio" aria-checked={on} className="pf-opt"
                  disabled={b.count === 0 && !on} onClick={() => onChange({ ...value, min: on ? undefined : lo, max: on ? undefined : hi })}>
                  <span className="pf-box">{on && <Check size={12} />}</span><span className="pf-name">{AMOUNT_BANDS[b.value]}</span><span className="pf-count">{b.count}</span>
                </button>
              );
            })}
            <AmountBoxes value={value} onChange={onChange} />
          </Menu>
        )}
      </span>
    </div>
  );
}

/** From / To dates, applied as soon as one is picked. */
function DateBoxes({ value, onChange }) {
  const today = indiaDay();
  return (
    <div className="pf-prices">
      <label htmlFor="of-from">From<input id="of-from" type="date" max={value.to || today} value={value.from ?? ''}
        onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} /></label>
      <label htmlFor="of-to">To<input id="of-to" type="date" min={value.from || undefined} max={today} value={value.to ?? ''}
        onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} /></label>
    </div>
  );
}

/** From / To in rupees, applied when the box is left or Enter is pressed. */
function AmountBoxes({ value, onChange }) {
  const [from, setFrom] = React.useState(value.min ?? '');
  const [to, setTo] = React.useState(value.max ?? '');
  const apply = () => {
    const n = (x) => (String(x).trim() === '' ? undefined : Math.max(0, Number(String(x).replace(/[^\d.]/g, '')) || 0));
    onChange({ ...value, min: n(from), max: n(to) });
  };
  return (
    <div className="pf-prices">
      <label htmlFor="of-min">From ₹<input id="of-min" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
      <label htmlFor="of-max">To ₹<input id="of-max" inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
    </div>
  );
}

/** The choices made, each with a ✕, and Clear all. */
export function ActiveFilters({ value, facets, onChange, onClearAll }) {
  const chips = [];
  const d = dateLabel(value.from, value.to);
  if (d) chips.push({ key: 'date', text: d, drop: () => onChange({ ...value, from: undefined, to: undefined }) });
  for (const k of LIST_KEYS) {
    for (const v of value[k] ?? []) chips.push({ key: `${k}:${v}`, text: `${LABELS[k]}: ${optionLabel(k, v, facets)}`, drop: () => onChange({ ...value, [k]: value[k].filter(x => x !== v) }) });
  }
  if (value.min !== undefined || value.max !== undefined) {
    chips.push({ key: 'amount', text: `Amount: ${value.min !== undefined ? formatRupees(value.min) : 'any'} to ${value.max !== undefined ? formatRupees(value.max) : 'any'}`, drop: () => onChange({ ...value, min: undefined, max: undefined }) });
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
        <Menu label="Sort" align="right" onClose={close}>
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
