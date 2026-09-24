import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Loader2, Search, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useOffer, useOfferOptions, useOfferTargetSearch } from '../hooks/useOffers';
import { describeOffer, SCOPE_OPTIONS, DEPARTMENT_LABEL } from '../utils/offerSummary';
import Select from './common/Select';

/**
 * Writing one offer.
 *
 * Laid out in the order a shop owner thinks about a sale: what comes off, what it comes off, who
 * gets it, when -- and everything else folded away under "More options" with a line saying what it
 * is set to, so the common offer is five fields and the unusual one is still possible.
 *
 * A sentence under the form says what the offer will do as it is typed. It is the check that
 * catches "20% off the whole bill" when "20% off sarees" was meant, before a customer does.
 *
 * Three things here are deliberate and easy to get wrong.
 *
 * **The end date.** `endsAt` is stored as the first moment the offer is NOT running, so an offer
 * ending on 30 September is 1 October 00:00. A merchant typing "30 September" means the whole of
 * the 30th, so the date they pick has a day added on the way out and taken off on the way in.
 *
 * **The save button.** Guarded with a ref, not state -- `saving` does not take effect until the
 * next render, and a double-click would send two offers.
 *
 * **Switching what it applies to.** Each choice keeps its own picks, so flicking from Products to
 * Types of garment and back does not throw away the twelve products somebody just searched for.
 */

const VALUE_TYPES = [
  { key: 'PERCENTAGE', label: 'Percentage off' },
  { key: 'FIXED_AMOUNT', label: 'Amount off' },
  { key: 'FIXED_PRICE', label: 'Set a price' }
];

const EMPTY_PICKS = { DRESS_TYPE: [], CATEGORY: [], PRODUCT: [], VARIANT: [] };

/** yyyy-mm-dd for a date input, in the browser's own day rather than UTC's. */
const toInputDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toInputTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/** The stored exclusive end, split back into the day and time a merchant would have typed. */
const endFieldsFrom = (endsAt) => {
  if (!endsAt) return { date: '', time: '' };
  const d = new Date(endsAt);
  if (d.getHours() === 0 && d.getMinutes() === 0) {
    return { date: toInputDate(new Date(d.getTime() - 1000)), time: '' };
  }
  return { date: toInputDate(d), time: toInputTime(d) };
};

const momentOf = (date, time, fallbackTime = '00:00') => new Date(`${date}T${(time || fallbackTime)}:00`);

const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

// ── small pieces ────────────────────────────────────────────────────────────────────────────────

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' };
const hintStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.45 };

function Field({ label, hint, children, htmlFor }) {
  return (
    <div style={{ marginBottom: '16px', minWidth: 0 }}>
      {label && <label htmlFor={htmlFor} style={labelStyle}>{label}</label>}
      {children}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

function Section({ title, children, first }) {
  return (
    <section style={{ paddingTop: first ? 0 : '20px', marginTop: first ? 0 : '4px', borderTop: first ? 'none' : '1px solid var(--border-light)' }}>
      <h4 style={{ margin: '0 0 14px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
        {title}
      </h4>
      {children}
    </section>
  );
}

/** Two or three mutually exclusive choices, side by side. A radio group underneath. */
function Segmented({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} style={{
      display: 'inline-flex', padding: '3px', borderRadius: '10px', background: 'var(--bg-input)',
      border: '1px solid var(--border-light)', maxWidth: '100%', minWidth: 0
    }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            style={{
              padding: '7px 14px', fontSize: '13px', fontWeight: on ? 600 : 500, borderRadius: '8px', border: 'none',
              cursor: 'pointer', flex: '1 1 auto', minWidth: 0, lineHeight: 1.25,
              background: on ? 'var(--bg-card)' : 'transparent',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: on ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A choice that can be on or off, with an optional count of what it covers. */
function Chip({ selected, onClick, children, count, onRemove, name, unit = 'product' }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={onRemove ? undefined : !!selected}
      aria-label={name ? (onRemove ? `Remove ${name}` : count != null ? `${name}, ${count} ${unit}${count === 1 ? '' : 's'}` : name) : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 11px', borderRadius: '999px',
        fontSize: '13px', cursor: 'pointer', maxWidth: '100%',
        border: `1px solid ${selected ? 'var(--text-primary)' : 'var(--border-light)'}`,
        background: selected ? 'var(--text-primary)' : 'var(--bg-input)',
        color: selected ? 'var(--bg-card)' : 'var(--text-primary)'
      }}>
      {selected && !onRemove && <Check size={13} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      {count != null && <span style={{ fontSize: '11px', opacity: 0.65 }}>{count}</span>}
      {onRemove && <X size={13} aria-hidden="true" />}
    </button>
  );
}

/**
 * Search products or SKUs and collect them.
 *
 * Results sit inline under the box rather than floating over the form: a floating list inside a
 * scrolling dialog gets clipped by the dialog's edge on a laptop, and on a phone covers the very
 * chips it is adding to.
 */
function TargetPicker({ scope, picked, labels, onToggle, selected }) {
  const isOn = (id) => (selected ?? picked).includes(id);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQ(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const { data: results, isFetching } = useOfferTargetSearch(open ? scope : null, q);
  const noun = scope === 'PRODUCT' ? 'products' : 'items';

  return (
    <div>
      {picked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {picked.map(id => (
            <Chip key={id} selected onRemove onClick={() => onToggle(id)} name={labels[id]?.label ?? 'item'}>
              {labels[id]?.label ?? 'Loading…'}{labels[id]?.sub && scope === 'VARIANT' ? ` · ${labels[id].sub.split(' · ')[0]}` : ''}
            </Chip>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-field" style={{ width: '100%', paddingLeft: '34px' }}
          value={text} onChange={e => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={scope === 'PRODUCT' ? 'Search by name, code or SKU' : 'Search by SKU or product name'}
          aria-label={`Search ${noun}`} />
        {isFetching && <Loader2 size={15} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', marginTop: '-7px', color: 'var(--text-muted)' }} />}
      </div>
      {open && (
        <div role="listbox" aria-label={`Matching ${noun}`} style={{
          marginTop: '6px', border: '1px solid var(--border-light)', borderRadius: '10px', maxHeight: '232px', overflowY: 'auto',
          background: 'var(--bg-card)'
        }}>
          {(results ?? []).length === 0 && !isFetching && (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {q ? `No ${noun} match “${q}”.` : `No ${noun} yet.`}
            </div>
          )}
          {(results ?? []).map(r => {
            const on = isOn(r.id);
            return (
              <button key={r.id} type="button" role="option" aria-selected={on}
                onClick={() => onToggle(r.id, r)}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: '10px', padding: '9px 14px', border: 'none',
                  borderBottom: '1px solid var(--border-light)', background: on ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer'
                }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, display: 'grid', placeItems: 'center',
                  border: `1.5px solid ${on ? 'var(--text-primary)' : 'var(--border-focus)'}`,
                  background: on ? 'var(--text-primary)' : 'transparent', color: 'var(--bg-card)'
                }}>{on && <Check size={12} />}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>
                </span>
              </button>
            );
          })}
          {(results ?? []).length === 20 && (
            <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>Showing the first 20. Type more to narrow it down.</div>
          )}
        </div>
      )}
    </div>
  );
}

/** Garment types: the shop's own list, filterable, with a way to name one nobody has used yet. */
// maxLength: the longest name the server accepts -- 60 for a garment type, 40 for a customer group.
function TypePicker({ options, picked, onToggle, unit = 'product', noun = 'type', emptyHint, maxLength = 60 }) {
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const known = useMemo(() => {
    const list = [...(options ?? [])];
    // A type the offer already holds but no product carries any more still shows, so it can be removed.
    for (const p of picked) {
      if (!list.some(t => t.value.trim().toLowerCase() === p.trim().toLowerCase())) list.push({ value: p, label: p, count: 0 });
    }
    return list;
  }, [options, picked]);

  const f = filter.trim().toLowerCase();
  const isPickedValue = (v) => picked.some(p => p.trim().toLowerCase() === v.trim().toLowerCase());
  // Types no product carries yet are folded away until asked for: sixteen chips of which eleven say
  // "0" bury the five a merchant is actually choosing between.
  const unused = known.filter(t => !t.count && !isPickedValue(t.value));
  const shown = f ? known.filter(t => (t.label ?? t.value).toLowerCase().includes(f))
    : showAll || unused.length < 3 ? known : known.filter(t => t.count || isPickedValue(t.value));
  const exact = known.some(t => t.value.trim().toLowerCase() === f);
  const isPicked = isPickedValue;

  return (
    <div>
      {known.length > 10 && (
        <input className="input-field" style={{ width: '100%', marginBottom: '10px' }} value={filter}
          onChange={e => setFilter(e.target.value)} placeholder={`Filter ${noun}s`} aria-label={`Filter ${noun}s`} />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {shown.map(t => (
          <Chip key={t.value} selected={isPicked(t.value)} count={t.count} onClick={() => onToggle(t.value)} name={t.label ?? t.value} unit={unit}>
            {t.label ?? t.value}
          </Chip>
        ))}
        {!f && !showAll && unused.length >= 3 && (
          <button type="button" onClick={() => setShowAll(true)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: '6px 4px', textDecoration: 'underline' }}>
            {unused.length} more with no {unit}s yet
          </button>
        )}
        {f && !exact && filter.trim().length <= maxLength && (
          <Chip onClick={() => { onToggle(filter.trim()); setFilter(''); }}>
            <Plus size={12} style={{ verticalAlign: '-2px' }} /> Add “{filter.trim()}”
          </Chip>
        )}
      </div>
      {known.length === 0 && (
        <div style={hintStyle}>{emptyHint ?? 'No garment types yet. Type one above once products have a dress type, or add types in Settings.'}</div>
      )}
      {known.length <= 10 && (
        <input className="input-field" style={{ width: '100%', marginTop: '10px' }} value={filter}
          onChange={e => setFilter(e.target.value)} placeholder={`Another ${noun}…`} aria-label={`Add a ${noun}`} />
      )}
    </div>
  );
}

const OUT_SCOPES = [
  { value: 'PRODUCT', label: 'Products' },
  { value: 'DRESS_TYPE', label: 'Types of garment' },
  { value: 'VARIANT', label: 'Particular items (SKU)' },
  { value: 'CATEGORY', label: 'Departments' }
];

/**
 * What the offer leaves out.
 *
 * Folded behind one link until used: most offers leave nothing out, and a second picker open by
 * default would double the height of the form for the one offer in ten that needs it.
 */
function ExclusionPicker({ outs, setOuts, labels, setLabels, options, open, setOpen }) {
  const [outScope, setOutScope] = useState('PRODUCT');
  const all = Object.entries(outs).flatMap(([scope, ids]) => ids.map(id => ({ scope, id })));
  const toggleOut = (id, result) => {
    if (result) setLabels(l => ({ ...l, [id]: { label: result.label, sub: result.sub } }));
    setOuts(o => {
      const list = o[outScope];
      const exists = outScope === 'DRESS_TYPE'
        ? list.find(x => x.trim().toLowerCase() === String(id).trim().toLowerCase())
        : list.find(x => x === id);
      return { ...o, [outScope]: exists ? list.filter(x => x !== exists) : [...list, id] };
    });
  };
  const nameOf = ({ scope, id }) => scope === 'CATEGORY' ? (DEPARTMENT_LABEL[id] ?? id) : scope === 'DRESS_TYPE' ? id : (labels[id]?.label ?? 'Loading…');

  if (!open && all.length === 0) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: '2px 0' }}>
        <Plus size={14} /> Leave some things out
      </button>
    );
  }

  return (
    <div style={{ borderRadius: '10px', border: '1px dashed var(--border-focus)', padding: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Except</div>
      {all.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {all.map(x => (
            <Chip key={`${x.scope}:${x.id}`} selected onRemove name={nameOf(x)}
              onClick={() => setOuts(o => ({ ...o, [x.scope]: o[x.scope].filter(v => v !== x.id) }))}>
              {nameOf(x)}
            </Chip>
          ))}
        </div>
      )}
      <Select className="input-field" aria-label="Leave out" style={{ width: '100%', marginBottom: '10px' }}
        value={outScope} onChange={e => setOutScope(e.target.value)}>
        {OUT_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
      {outScope === 'DRESS_TYPE' && <TypePicker options={options?.dressTypes} picked={outs.DRESS_TYPE} onToggle={toggleOut} />}
      {outScope === 'CATEGORY' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(options?.departments ?? []).map(d => (
            <Chip key={d.value} selected={outs.CATEGORY.includes(d.value)} count={d.count} name={d.label} onClick={() => toggleOut(d.value)}>{d.label}</Chip>
          ))}
        </div>
      )}
      {(outScope === 'PRODUCT' || outScope === 'VARIANT') && (
        // Chips are shown above for every kind at once, so the picker's own chips are not repeated.
        <TargetPicker key={`out-${outScope}`} scope={outScope} picked={[]} selected={outs[outScope]} labels={labels} onToggle={toggleOut} />
      )}
    </div>
  );
}

const DAY_LETTERS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];

// ── the editor ──────────────────────────────────────────────────────────────────────────────────

export default function OfferEditor({ offer, onClose, onSave }) {
  const { data: options } = useOfferOptions();
  const { data: detail } = useOffer(offer?.id && [...(offer.targets ?? []), ...(offer.exclusions ?? [])].some(t => t.scope === 'PRODUCT' || t.scope === 'VARIANT') && !offer.history ? offer.id : null);

  const initialScope = offer?.scope ?? 'ALL';
  const [form, setForm] = useState(() => ({
    name: offer?.name ?? '',
    trigger: offer?.trigger ?? 'AUTOMATIC',
    couponCode: offer?.couponCode ?? '',
    level: offer?.level ?? 'LINE',
    valueType: offer?.valueType ?? 'PERCENTAGE',
    value: offer?.value != null ? String(Number(offer.value)) : '',
    maxDiscount: offer?.maxDiscount != null ? String(Number(offer.maxDiscount)) : '',
    scope: initialScope,
    minSubtotal: offer?.minSubtotal != null ? String(Number(offer.minSubtotal)) : '',
    minQuantity: offer?.minQuantity != null ? String(offer.minQuantity) : '',
    startsAt: toInputDate(offer?.startsAt ?? new Date()),
    startsTime: offer?.startsAt ? toInputTime(offer.startsAt) : '',
    endsAt: endFieldsFrom(offer?.endsAt).date,
    endsTime: endFieldsFrom(offer?.endsAt).time,
    // Empty on the offer means everywhere; on the screen that is both boxes ticked.
    till: !(offer?.channels?.length) || offer.channels.includes('POS'),
    online: !(offer?.channels?.length) || offer.channels.includes('ONLINE'),
    locationIds: offer?.locationIds ?? [],
    usageLimit: offer?.usageLimit != null ? String(offer.usageLimit) : '',
    usageLimitPerCustomer: offer?.usageLimitPerCustomer != null ? String(offer.usageLimitPerCustomer) : '',
    priority: String(offer?.priority ?? 0),
    stackable: offer?.stackable ?? false,
    // New amount-off offers default to per piece: "200 off each saree" is what nearly everyone means.
    perPiece: offer ? !!offer.perPiece : true,
    codeKind: offer?.uniqueCodes ? 'SINGLE' : 'SHARED',
    forGroups: !!offer?.customerTags?.length,
    customerTags: offer?.customerTags ?? [],
    hoursOn: !!offer?.schedule,
    days: offer?.schedule?.days?.length ? offer.schedule.days : [0, 1, 2, 3, 4, 5, 6],
    hoursFrom: offer?.schedule?.from ?? '16:00',
    hoursTo: offer?.schedule?.to ?? '19:00',
    changeNote: ''
  }));

  /*
   * The dates exactly as they were loaded, so an edit that never touched them sends the stored
   * moments back unchanged. The inputs only hold minutes; re-sending them would drop the seconds an
   * offer was created with, and its history would say "Start moved" when nobody moved it.
   */
  const loadedDates = useRef({
    startsAt: toInputDate(offer?.startsAt ?? new Date()), startsTime: offer?.startsAt ? toInputTime(offer.startsAt) : '',
    endsAt: endFieldsFrom(offer?.endsAt).date, endsTime: endFieldsFrom(offer?.endsAt).time
  });

  const [outs, setOuts] = useState(() => {
    const o = { ...EMPTY_PICKS };
    for (const e of offer?.exclusions ?? []) o[e.scope] = [...(o[e.scope] ?? []), e.refId];
    return o;
  });
  const [outsOpen, setOutsOpen] = useState(false);

  const [picks, setPicks] = useState(() => ({
    ...EMPTY_PICKS,
    ...(initialScope !== 'ALL' ? { [initialScope]: (offer?.targets ?? []).map(t => t.refId) } : {})
  }));
  const [labels, setLabels] = useState(() =>
    Object.fromEntries([...(offer?.targets ?? []), ...(offer?.exclusions ?? [])].filter(t => t.label).map(t => [t.refId, { label: t.label }])));

  // Names for products and SKUs the offer already holds, once the offer page's copy has loaded.
  useEffect(() => {
    if (!detail?.targets) return;
    setLabels(l => ({ ...Object.fromEntries([...detail.targets, ...(detail.exclusions ?? [])].map(t => [t.refId, { label: t.label }])), ...l }));
  }, [detail]);

  const hasExtras = !!(offer && (offer.channels?.length || offer.locationIds?.length || offer.usageLimit
    || offer.usageLimitPerCustomer || offer.priority || offer.stackable));
  const [moreOpen, setMoreOpen] = useState(hasExtras);

  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const set = (k) => (e) => {
    const v = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !inFlight.current) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const wholeBill = form.level === 'ORDER';
  const scope = wholeBill ? 'ALL' : form.scope;
  const picked = scope === 'ALL' ? [] : picks[scope];

  const setLevel = (level) => setForm(f => ({
    ...f, level,
    // A bill cannot be set to one price; the nearest thing a merchant means is an amount off it.
    valueType: level === 'ORDER' && f.valueType === 'FIXED_PRICE' ? 'FIXED_AMOUNT' : f.valueType
  }));

  const toggle = (id, result) => {
    if (result) setLabels(l => ({ ...l, [id]: { label: result.label, sub: result.sub } }));
    setPicks(p => {
      const list = p[scope];
      const exists = scope === 'DRESS_TYPE'
        ? list.find(x => x.trim().toLowerCase() === String(id).trim().toLowerCase())
        : list.find(x => x === id);
      return { ...p, [scope]: exists ? list.filter(x => x !== exists) : [...list, id] };
    });
  };

  const channels = form.till && form.online ? [] : [form.till && 'POS', form.online && 'ONLINE'].filter(Boolean);
  const exclusions = Object.entries(outs).flatMap(([s, ids]) => ids.map(refId => ({ scope: s, refId })));
  const exclusionLabels = exclusions.map(e => e.scope === 'CATEGORY' ? (DEPARTMENT_LABEL[e.refId] ?? e.refId) : e.scope === 'DRESS_TYPE' ? e.refId : (labels[e.refId]?.label ?? 'an item'));
  const uniqueCodes = form.trigger === 'CODE' && form.codeKind === 'SINGLE';
  const customerTags = form.forGroups ? form.customerTags : [];
  const everyDay = form.days.length === 7;
  const schedule = form.hoursOn ? { ...(everyDay ? {} : { days: form.days }), from: form.hoursFrom, to: form.hoursTo } : null;
  const amountOffItems = form.valueType === 'FIXED_AMOUNT' && form.level === 'LINE';
  const locationNames = form.locationIds.map(id => options?.locations?.find(l => l.id === id)?.name ?? (offer?.locations?.find(l => l.id === id)?.name)).filter(Boolean);

  const targetLabels = picked.map(id =>
    scope === 'CATEGORY' ? (DEPARTMENT_LABEL[id] ?? id) : scope === 'DRESS_TYPE' ? id : (labels[id]?.label ?? 'a product'));

  const summary = describeOffer({
    ...form, scope, targetLabels, channels, locationNames, exclusionLabels, exclusionCount: exclusions.length,
    customerTags, schedule, uniqueCodes, perPiece: amountOffItems && form.perPiece,
    minSubtotal: numberOrNull(form.minSubtotal), minQuantity: numberOrNull(form.minQuantity),
    usageLimit: numberOrNull(form.usageLimit), usageLimitPerCustomer: numberOrNull(form.usageLimitPerCustomer),
    startsAt: form.startsAt ? momentOf(form.startsAt, form.startsTime) : null,
    endsAt: form.endsAt ? (form.endsTime ? momentOf(form.endsAt, form.endsTime) : new Date(momentOf(form.endsAt, '').getTime() + 86400000)) : null
  });

  const moreSummary = [
    channels.length === 0 ? 'Till and online' : channels[0] === 'POS' ? 'Till only' : 'Online only',
    form.locationIds.length ? `${form.locationIds.length} location${form.locationIds.length === 1 ? '' : 's'}` : 'all locations',
    form.usageLimitPerCustomer ? `${form.usageLimitPerCustomer}× per customer` : null,
    form.usageLimit ? `${form.usageLimit} uses` : null,
    form.stackable ? 'combines' : "doesn't combine"
  ].filter(Boolean).join(' · ');

  const nothingSells = !form.till && !form.online;
  const noDays = form.hoursOn && form.days.length === 0;
  const noGroups = form.forGroups && form.customerTags.length === 0;
  // An empty or unreadable start date used to throw while building the request, and the catch below
  // took it for a failed save: the spinner stopped and nothing was said.
  const noStart = !form.startsAt || Number.isNaN(momentOf(form.startsAt, form.startsTime).getTime());

  /*
   * What stops this offer being saved, in the server's own terms, so the button can be greyed with
   * the reason beside it. It used to be always pressable: a 150% offer read "150% off everything"
   * underneath -- a sentence the till would never honour -- and only the server said no.
   * `wrong` is a value that cannot work (said in red); `missing` is something not filled in yet.
   */
  const valueText = String(form.value ?? '').trim();
  const valueNumber = Number(valueText);
  const wrong =
    valueText !== '' && !Number.isFinite(valueNumber) ? 'Enter how much it takes off as a number.'
    : valueText !== '' && valueNumber <= 0 ? 'An offer has to take off more than nothing.'
    : form.valueType === 'PERCENTAGE' && valueNumber > 100 ? 'A percentage cannot be more than 100.'
    : form.valueType === 'PERCENTAGE' && String(form.maxDiscount).trim() !== '' && !(Number(form.maxDiscount) > 0)
      ? 'A cap has to be more than nothing. Leave it empty for no cap.'
    : null;
  const whatToPick = { CATEGORY: 'departments', DRESS_TYPE: 'types of garment', PRODUCT: 'products', VARIANT: 'items' }[scope] ?? 'items';
  const missing =
    !form.name.trim() ? 'Give the offer a name.'
    : valueText === '' ? 'Enter how much it takes off.'
    : form.trigger === 'CODE' && !uniqueCodes && !form.couponCode.trim() ? 'Type the code customers will use.'
    : scope !== 'ALL' && picked.length === 0 ? `Choose which ${whatToPick} this applies to.`
    : noStart ? 'Say when the offer starts.'
    : nothingSells ? 'Tick at least one place it sells at.'
    : noDays ? 'Choose at least one day for its hours.'
    : noGroups ? 'Choose at least one customer group.'
    : null;
  // Retired while this was open -- by someone else, or from another tab. Saving could only be
  // refused, so it is said here instead of after the merchant has typed their changes.
  const retired = offer?.status === 'ARCHIVED'
    ? 'This offer has been retired, so it cannot be changed. Close this and use Duplicate to copy it into a new one.'
    : null;
  const stopReason = retired ?? wrong ?? missing;
  const blocked = Boolean(stopReason);

  const submit = async () => {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        trigger: form.trigger,
        couponCode: form.trigger === 'CODE' && !uniqueCodes ? form.couponCode.trim() : null,
        uniqueCodes,
        perPiece: amountOffItems && form.perPiece,
        exclusions,
        customerTags,
        schedule,
        level: form.level,
        valueType: form.valueType,
        value: Number(form.value),
        maxDiscount: form.valueType === 'PERCENTAGE' ? numberOrNull(form.maxDiscount) : null,
        scope,
        targets: picked.map(refId => ({ scope, refId })),
        minSubtotal: numberOrNull(form.minSubtotal),
        minQuantity: numberOrNull(form.minQuantity),
        channels,
        locationIds: form.locationIds,
        startsAt: offer && form.startsAt === loadedDates.current.startsAt && form.startsTime === loadedDates.current.startsTime
          ? offer.startsAt
          : momentOf(form.startsAt, form.startsTime).toISOString(),
        endsAt: offer && form.endsAt === loadedDates.current.endsAt && form.endsTime === loadedDates.current.endsTime
          ? (offer.endsAt ?? null)
          : form.endsAt
          ? (form.endsTime
              ? momentOf(form.endsAt, form.endsTime).toISOString()
              : new Date(momentOf(form.endsAt, '').getTime() + 86400000).toISOString())
          : null,
        usageLimit: numberOrNull(form.usageLimit),
        usageLimitPerCustomer: numberOrNull(form.usageLimitPerCustomer),
        priority: Number(form.priority || 0),
        stackable: form.stackable,
        ...(offer && form.changeNote.trim() ? { changeNote: form.changeNote.trim() } : {})
      });
    } catch {
      // The mutation already showed what went wrong. Staying open keeps the merchant's typing.
      setSaving(false);
      inFlight.current = false;
    }
  };

  const covers = scope === 'ALL' ? 'the bill' : 'the items it covers';
  const valueHint =
    form.valueType === 'PERCENTAGE' ? 'e.g. 20 for 20% off'
    : form.valueType === 'FIXED_AMOUNT' ? (wholeBill ? 'Taken off the bill once, shared across its lines.' : form.perPiece ? 'Taken off every piece it covers.' : 'Taken once off each matching line, however many pieces are on it.')
    : 'The price each piece sells at, e.g. 999.';

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="offer-editor-title" style={{
        width: '640px', maxWidth: '100%', padding: 0,
        maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="offer-editor-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {offer ? `Edit ${offer.offerCode}` : 'New offer'}
          </h3>
          <button onClick={() => !saving && onClose()} className="btn-icon" disabled={saving} aria-label="Close"
            style={{ background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          <Section title="The discount" first>
            <Field label="Name" hint="What the customer sees on their receipt." htmlFor="offer-name">
              <input id="offer-name" className="input-field" style={{ width: '100%' }} value={form.name}
                onChange={set('name')} placeholder="Deepavali Sale" autoFocus />
            </Field>

            <Field label="Takes money off"
              hint={wholeBill ? 'Comes off the bill total, and applies to everything on it.' : 'Comes off the price of each item it covers.'}>
              <Segmented label="Takes money off" value={form.level} onChange={setLevel}
                options={[{ value: 'LINE', label: 'Each item' }, { value: 'ORDER', label: 'The whole bill' }]} />
            </Field>

            <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="How" htmlFor="offer-type">
                <Select id="offer-type" className="input-field" style={{ width: '100%' }} value={form.valueType} onChange={set('valueType')}>
                  {VALUE_TYPES.filter(v => !(wholeBill && v.key === 'FIXED_PRICE')).map(v =>
                    <option key={v.key} value={v.key}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label={form.valueType === 'PERCENTAGE' ? 'Percent' : 'Amount (₹)'} hint={valueHint} htmlFor="offer-value">
                <input id="offer-value" className="input-field" type="number" min="0" step="0.01" inputMode="decimal"
                  max={form.valueType === 'PERCENTAGE' ? 100 : undefined}
                  aria-invalid={Boolean(wrong) || undefined} aria-describedby="offer-editor-status"
                  style={{ width: '100%', ...(wrong ? { borderColor: 'var(--accent-danger)' } : {}) }}
                  value={form.value} onChange={set('value')} />
              </Field>
            </div>

            {amountOffItems && (
              <Field label="Comes off">
                <Segmented label="Comes off" value={form.perPiece ? 'PIECE' : 'LINE'}
                  onChange={(v) => setForm(f => ({ ...f, perPiece: v === 'PIECE' }))}
                  options={[{ value: 'PIECE', label: 'Every piece' }, { value: 'LINE', label: 'Each line once' }]} />
              </Field>
            )}

            {form.valueType === 'PERCENTAGE' && (
              <Field label="Never more than (optional)" hint="A cap in rupees, so a percentage cannot run away on a very large bill." htmlFor="offer-cap">
                <input id="offer-cap" className="input-field" type="number" min="0" step="0.01" inputMode="decimal" style={{ width: '100%' }}
                  value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" />
              </Field>
            )}
          </Section>

          <Section title="Applies to">
            {wholeBill && (
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Everything on the bill.</p>
            )}
            {!wholeBill && (<>
              <Field htmlFor="offer-scope">
                <Select id="offer-scope" aria-label="Applies to" className="input-field" style={{ width: '100%' }} value={form.scope} onChange={set('scope')}>
                  {SCOPE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>

              {scope === 'DRESS_TYPE' && (
                <Field hint="Matches the dress type on each product, whatever capitals it was typed with.">
                  <TypePicker options={options?.dressTypes} picked={picked} onToggle={toggle} />
                </Field>
              )}

              {scope === 'CATEGORY' && (
                <Field>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(options?.departments ?? Object.entries(DEPARTMENT_LABEL).map(([value, label]) => ({ value, label }))).map(d => (
                      <Chip key={d.value} selected={picked.includes(d.value)} count={d.count} onClick={() => toggle(d.value)} name={d.label}>{d.label}</Chip>
                    ))}
                  </div>
                </Field>
              )}

              {(scope === 'PRODUCT' || scope === 'VARIANT') && (
                <Field hint={scope === 'VARIANT' ? 'For one size or colour of a product. To include every size, choose Products.' : 'Every size and colour of each product.'}>
                  <TargetPicker key={scope} scope={scope} picked={picked} labels={labels} onToggle={toggle} />
                </Field>
              )}
            </>)}
            <Field hint={exclusions.length ? (wholeBill ? 'Left-out items do not count towards the minimum, and take no share of the discount.' : 'Left-out items never get this offer.') : null}>
              <ExclusionPicker outs={outs} setOuts={setOuts} labels={labels} setLabels={setLabels} options={options} open={outsOpen} setOpen={setOutsOpen} />
            </Field>
          </Section>

          <Section title="Who gets it">
            <Field>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Segmented label="How it is given" value={form.trigger} onChange={(v) => setForm(f => ({ ...f, trigger: v }))}
                  options={[{ value: 'AUTOMATIC', label: 'Automatically' }, { value: 'CODE', label: 'With a code' }]} />
              </div>
            </Field>

            {form.trigger === 'CODE' && (
              <Field hint={uniqueCodes
                ? 'Each code works once. Make them on the offer page after saving, then print or send them.'
                : 'Anyone with the code can use it, as often as the limits allow.'}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Segmented label="Kind of code" value={form.codeKind} onChange={(v) => setForm(f => ({ ...f, codeKind: v }))}
                    options={[{ value: 'SHARED', label: 'One shared code' }, { value: 'SINGLE', label: 'Single-use codes' }]} />
                  {!uniqueCodes && (
                    <input className="input-field" aria-label="Code" style={{ flex: '1 1 160px', minWidth: 0, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                      value={form.couponCode} onChange={set('couponCode')} placeholder="DEEPAVALI" />
                  )}
                </div>
              </Field>
            )}

            <Field label="Customers" hint={form.forGroups
              ? (noGroups ? 'Choose at least one group.' : 'Only customers in these groups get it. Put customers in groups on their page.')
              : null}>
              <Segmented label="Customers" value={form.forGroups ? 'GROUPS' : 'ALL'}
                onChange={(v) => setForm(f => ({ ...f, forGroups: v === 'GROUPS' }))}
                options={[{ value: 'ALL', label: 'Everyone' }, { value: 'GROUPS', label: 'Some groups' }]} />
              {form.forGroups && (
                <div style={{ marginTop: '10px' }}>
                  <TypePicker options={options?.customerTags} picked={form.customerTags} unit="customer" noun="group" maxLength={40}
                    emptyHint="No customer groups yet. Type one, like VIP, and add customers to it from their page."
                    onToggle={(tag) => setForm(f => {
                      const exists = f.customerTags.find(t => t.trim().toLowerCase() === String(tag).trim().toLowerCase());
                      return { ...f, customerTags: exists ? f.customerTags.filter(t => t !== exists) : [...f.customerTags, tag] };
                    })} />
                </div>
              )}
            </Field>

            <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Minimum spend (optional)" hint={form.level === 'ORDER' ? 'Counts the bill after item offers, leaving out anything it excludes.' : `Counts ${covers}, at full price.`} htmlFor="offer-min-spend">
                <input id="offer-min-spend" className="input-field" type="number" min="0" step="0.01" inputMode="decimal" style={{ width: '100%' }}
                  value={form.minSubtotal} onChange={set('minSubtotal')} placeholder="None" />
              </Field>
              <Field label="Minimum items (optional)" hint={`Counts pieces of ${covers}.`} htmlFor="offer-min-items">
                <input id="offer-min-items" className="input-field" type="number" min="1" step="1" inputMode="numeric" style={{ width: '100%' }}
                  value={form.minQuantity} onChange={set('minQuantity')} placeholder="None" />
              </Field>
            </div>
          </Section>

          <Section title="When">
            <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Starts"
                hint={form.startsAt && momentOf(form.startsAt, form.startsTime) > new Date()
                  ? 'Starts on its own once you schedule it.'
                  : 'Leave the time empty to start at midnight.'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input-field" type="date" aria-label="Start date" style={{ flex: 2, minWidth: 0 }}
                    value={form.startsAt} onChange={set('startsAt')} />
                  <input className="input-field" type="time" aria-label="Start time" style={{ flex: 1, minWidth: 0 }}
                    value={form.startsTime} onChange={set('startsTime')} />
                </div>
              </Field>
              <Field label="Last day (optional)"
                hint={!form.endsAt ? 'Runs until you stop it.' : form.endsTime ? 'Stops at exactly this time.' : 'Runs until 11:59 pm that day.'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input-field" type="date" aria-label="Last day" style={{ flex: 2, minWidth: 0 }}
                    value={form.endsAt} onChange={set('endsAt')} />
                  <input className="input-field" type="time" aria-label="End time" style={{ flex: 1, minWidth: 0 }}
                    value={form.endsTime} onChange={set('endsTime')} disabled={!form.endsAt} />
                </div>
              </Field>
            </div>

            <Field hint={form.hoursOn ? (noDays ? 'Choose at least one day.' : 'In your shop’s own time. An end before the start runs past midnight.') : null}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={form.hoursOn} onChange={set('hoursOn')} /> Only at certain hours
              </label>
              {form.hoursOn && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div role="group" aria-label="Days" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {DAY_LETTERS.map(([label, d]) => (
                      <Chip key={d} selected={form.days.includes(d)} name={label}
                        onClick={() => setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }))}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input className="input-field" type="time" aria-label="From" style={{ flex: 1, minWidth: 0 }} value={form.hoursFrom} onChange={set('hoursFrom')} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>to</span>
                    <input className="input-field" type="time" aria-label="To" style={{ flex: 1, minWidth: 0 }} value={form.hoursTo} onChange={set('hoursTo')} />
                  </div>
                </div>
              )}
            </Field>
          </Section>

          <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '4px' }}>
            <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 0', border: 'none',
                background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left'
              }}>
              {moreOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>More options</span>
              {!moreOpen && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {moreSummary}
                </span>
              )}
            </button>

            {moreOpen && (
              <div style={{ paddingTop: '6px' }}>
                <Field label="Sells at" hint={nothingSells ? 'Tick at least one, or the offer can never apply.' : 'Online includes the website and Shopify.'}>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {[['till', 'Till'], ['online', 'Online store']].map(([k, label]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" checked={form[k]} onChange={set(k)} /> {label}
                      </label>
                    ))}
                  </div>
                </Field>

                {(options?.locations?.length ?? 0) > 1 && (
                  <Field label="Locations" hint={form.locationIds.length ? 'Only orders from these locations get it.' : 'Every location. Choose some to limit it.'}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {options.locations.map(l => (
                        <Chip key={l.id} selected={form.locationIds.includes(l.id)}
                          onClick={() => setForm(f => ({ ...f, locationIds: f.locationIds.includes(l.id) ? f.locationIds.filter(x => x !== l.id) : [...f.locationIds, l.id] }))}>
                          {l.name}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                )}

                <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Field label="Uses per customer" htmlFor="offer-per-customer"
                    hint="Only bills with a customer on them can be counted, so walk-in guests will not get it.">
                    <input id="offer-per-customer" className="input-field" type="number" min="1" step="1" inputMode="numeric" style={{ width: '100%' }}
                      value={form.usageLimitPerCustomer} onChange={set('usageLimitPerCustomer')} placeholder="No limit" />
                  </Field>
                  <Field label="Total uses" hint="e.g. 50 for “first 50 customers”." htmlFor="offer-limit">
                    <input id="offer-limit" className="input-field" type="number" min="1" step="1" inputMode="numeric" style={{ width: '100%' }}
                      value={form.usageLimit} onChange={set('usageLimit')} placeholder="No limit" />
                  </Field>
                </div>

                <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Field label="Priority" hint="When two offers want the same item, the higher number wins." htmlFor="offer-priority">
                    <input id="offer-priority" className="input-field" type="number" step="1" style={{ width: '100%' }}
                      value={form.priority} onChange={set('priority')} />
                  </Field>
                  <Field label="Combining" hint="Off means only the best single offer applies.">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '9px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="checkbox" checked={form.stackable} onChange={set('stackable')} /> Can combine with other offers
                    </label>
                  </Field>
                </div>
              </div>
            )}
          </section>

          {offer && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <Field label="Why the change? (optional)" hint="Kept in the offer's history." htmlFor="offer-note">
                <input id="offer-note" className="input-field" style={{ width: '100%' }}
                  value={form.changeNote} onChange={set('changeNote')} placeholder="e.g. Extended for the weekend" />
              </Field>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)' }}>
          {/* The offer in one sentence -- or, while it cannot be saved, why not. Never the sentence
              for a value that will be refused. */}
          <div id="offer-editor-status" aria-live="polite" style={{ padding: '12px 24px 0', fontSize: '13px', lineHeight: 1.5, color: retired || wrong || noStart ? 'var(--accent-danger)' : missing ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
            {stopReason ?? summary.sentence ?? 'Enter how much it takes off to see what this offer will do.'}
          </div>
          <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={saving || blocked}
              aria-describedby="offer-editor-status" title={stopReason ?? undefined}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Saving...' : offer ? 'Save changes' : 'Create offer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
