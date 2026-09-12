import React, { useState, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Writing one offer.
 *
 * Two things here are deliberate and easy to get wrong.
 *
 * **The end date.** `endsAt` is stored as the first moment the offer is NOT running, so an offer
 * ending on 30 September is 1 October 00:00. A merchant typing "30 September" means the whole of
 * the 30th, so the date they pick has a day added on the way out and taken off on the way in, and
 * the field is labelled with the time it really ends. Nobody should ever have to reason about
 * which side of midnight a sale stops.
 *
 * **The save button.** Guarded with a ref, not state -- `saving` does not take effect until the
 * next render, and a double-click would send two offers. The same fault was found on Confirm and
 * on Dispatch by pressing them quickly.
 */

const VALUE_TYPES = [
  { key: 'PERCENTAGE',   label: 'Percentage off', hint: 'e.g. 20 for 20% off' },
  { key: 'FIXED_AMOUNT', label: 'Amount off',     hint: 'e.g. 500 for ₹500 off' },
  { key: 'FIXED_PRICE',  label: 'Set a price',    hint: 'e.g. 999 to sell at ₹999 each' }
];

/** yyyy-mm-dd for a date input, in the browser's own day rather than UTC's. */
const toInputDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/** The day a merchant picked, shown back as the last day the offer runs. */
const endDateForDisplay = (endsAt) => {
  if (!endsAt) return '';
  return toInputDate(new Date(new Date(endsAt).getTime() - 1000));
};

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

export default function OfferEditor({ offer, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: offer?.name ?? '',
    description: offer?.description ?? '',
    trigger: offer?.trigger ?? 'AUTOMATIC',
    couponCode: offer?.couponCode ?? '',
    level: offer?.level ?? 'LINE',
    valueType: offer?.valueType ?? 'PERCENTAGE',
    value: offer?.value != null ? String(Number(offer.value)) : '',
    maxDiscount: offer?.maxDiscount != null ? String(Number(offer.maxDiscount)) : '',
    minSubtotal: offer?.minSubtotal != null ? String(Number(offer.minSubtotal)) : '',
    minQuantity: offer?.minQuantity != null ? String(offer.minQuantity) : '',
    startsAt: toInputDate(offer?.startsAt ?? new Date()),
    endsAt: endDateForDisplay(offer?.endsAt),
    usageLimit: offer?.usageLimit != null ? String(offer.usageLimit) : '',
    priority: String(offer?.priority ?? 0),
    stackable: offer?.stackable ?? false,
    changeNote: ''
  }));

  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const set = (k) => (e) => {
    const v = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        trigger: form.trigger,
        couponCode: form.trigger === 'CODE' ? form.couponCode.trim() : null,
        level: form.level,
        valueType: form.valueType,
        value: Number(form.value),
        // A cap only means anything on a percentage, and the server refuses it elsewhere -- so it
        // is dropped here rather than sent and bounced back as an error the merchant did not earn.
        maxDiscount: form.valueType === 'PERCENTAGE' ? numberOrNull(form.maxDiscount) : null,
        minSubtotal: numberOrNull(form.minSubtotal),
        minQuantity: numberOrNull(form.minQuantity),
        startsAt: new Date(`${form.startsAt}T00:00:00`).toISOString(),
        // A day added back on: the merchant picked the last day it RUNS, and the server stores the
        // first moment it does not.
        endsAt: form.endsAt
          ? new Date(new Date(`${form.endsAt}T00:00:00`).getTime() + 86400000).toISOString()
          : null,
        usageLimit: numberOrNull(form.usageLimit),
        priority: Number(form.priority || 0),
        stackable: form.stackable,
        ...(offer && form.changeNote.trim() ? { changeNote: form.changeNote.trim() } : {})
      });
    } catch {
      // The mutation already showed what went wrong. Staying open is deliberate: the merchant can
      // read it and fix the field, instead of the dialog vanishing with their typing in it.
      setSaving(false);
      inFlight.current = false;
    }
  };

  const valueHint = VALUE_TYPES.find(v => v.key === form.valueType)?.hint;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="card" style={{
        width: '680px', maxWidth: '100%', padding: 0,
        // Never taller than the window, so Save cannot end up below the fold on a laptop -- the
        // fault that made the catalogue dialog look as though it had no way to say yes.
        maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {offer ? `Edit ${offer.offerCode}` : 'New offer'}
          </h3>
          <button onClick={() => !saving && onClose()} className="btn-icon" disabled={saving}
            style={{ background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <Field label="What is it called?" hint="This is what the customer sees on their receipt.">
            <input className="input-field" style={{ width: '100%' }} value={form.name}
              onChange={set('name')} placeholder="Deepavali Sale" autoFocus />
          </Field>

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="How does it apply?">
              <select className="input-field" style={{ width: '100%' }} value={form.trigger} onChange={set('trigger')}>
                <option value="AUTOMATIC">On its own</option>
                <option value="CODE">Only with a code</option>
              </select>
            </Field>

            {form.trigger === 'CODE' && (
              <Field label="The code" hint="Letters, numbers, hyphens. 3 to 32 characters.">
                <input className="input-field" style={{ width: '100%', fontFamily: 'monospace', textTransform: 'uppercase' }}
                  value={form.couponCode} onChange={set('couponCode')} placeholder="DEEPAVALI" />
              </Field>
            )}
          </div>

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="What does it take off?">
              <select className="input-field" style={{ width: '100%' }} value={form.valueType} onChange={set('valueType')}>
                {VALUE_TYPES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            </Field>

            <Field label="How much?" hint={valueHint}>
              <input className="input-field" type="number" min="0" step="0.01" style={{ width: '100%' }}
                value={form.value} onChange={set('value')} />
            </Field>
          </div>

          {form.valueType === 'PERCENTAGE' && (
            <Field label="Cap it at (optional)" hint="Stops a percentage running away on an unusually large basket.">
              <input className="input-field" type="number" min="0" step="0.01" style={{ width: '100%' }}
                value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="e.g. 2000" />
            </Field>
          )}

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Starts on">
              <input className="input-field" type="date" style={{ width: '100%' }}
                value={form.startsAt} onChange={set('startsAt')} />
            </Field>
            <Field label="Last day (optional)"
              hint={form.endsAt ? 'Runs until 11:59 pm on this day.' : 'Leave empty to run until you stop it.'}>
              <input className="input-field" type="date" style={{ width: '100%' }}
                value={form.endsAt} onChange={set('endsAt')} />
            </Field>
          </div>

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Smallest basket (optional)" hint="Only applies once the basket reaches this.">
              <input className="input-field" type="number" min="0" step="0.01" style={{ width: '100%' }}
                value={form.minSubtotal} onChange={set('minSubtotal')} placeholder="e.g. 5000" />
            </Field>
            <Field label="Total times it can be used (optional)">
              <input className="input-field" type="number" min="1" step="1" style={{ width: '100%' }}
                value={form.usageLimit} onChange={set('usageLimit')} placeholder="No limit" />
            </Field>
          </div>

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Priority" hint="When two offers want the same item, the higher number wins.">
              <input className="input-field" type="number" step="1" style={{ width: '100%' }}
                value={form.priority} onChange={set('priority')} />
            </Field>
            <Field label="Can it stack?" hint="Off means only the best single offer applies to an item.">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.stackable} onChange={set('stackable')} />
                <span style={{ fontSize: '14px' }}>Allow on top of other offers</span>
              </label>
            </Field>
          </div>

          {offer && (
            <Field label="Why are you changing it? (optional)"
              hint="Kept with the version, so this change can be explained months later.">
              <input className="input-field" style={{ width: '100%' }}
                value={form.changeNote} onChange={set('changeNote')} placeholder="e.g. Extended for the weekend" />
            </Field>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-dark)' }}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : offer ? 'Save changes' : 'Create offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
