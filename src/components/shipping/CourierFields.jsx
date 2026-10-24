import React, { useEffect, useState } from 'react';
import Select from '../common/Select';
import { useCouriers, useAddCourier } from '../../hooks/useShipping';

/**
 * Who is carrying this parcel, and the number on the courier's slip.
 *
 * Used in Create Dispatch and when adding or changing a parcel's courier on the order page. The
 * list is the shop's own (Settings → Couriers). "+ Add a courier" adds one right here, with the
 * common Indian couriers as one-tap choices, so nobody has to leave the dispatch half made.
 *
 * `value` is { courierId, trackingNumber }. courierId '' is "no courier": a counter hand-over.
 * With `startWithDefault`, the shop's default courier is chosen once the list arrives.
 */
const ADD = '__add__';
const label = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 };

export default function CourierFields({ value, onChange, startWithDefault = false, idPrefix = 'cf' }) {
  const { data, isLoading } = useCouriers();
  const add = useAddCourier(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', trackingLink: '' });
  const couriers = data?.couriers ?? [];
  const chosen = couriers.find(c => c.id === value.courierId);

  // Once, when the list arrives: the default courier for a parcel going to an address.
  useEffect(() => {
    if (value.courierId !== undefined || !data) return;
    const def = startWithDefault ? couriers.find(c => c.isDefault) : null;
    onChange({ ...value, courierId: def?.id ?? '' });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id) => {
    if (id === ADD) { setAdding(true); return; }
    onChange({ ...value, courierId: id });
  };
  const save = (body) => add.mutate(body, {
    onSuccess: (c) => { onChange({ ...value, courierId: c.id }); setAdding(false); setDraft({ name: '', trackingLink: '' }); }
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }} className="cf-row">
        <div>
          <label style={label} htmlFor={`${idPrefix}-courier`}>Courier</label>
          <Select id={`${idPrefix}-courier`} className="input-field" value={adding ? ADD : (value.courierId ?? '')} onChange={(e) => pick(e.target.value)} style={{ width: '100%' }} disabled={isLoading}>
            <option value="">No courier (handed over)</option>
            {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={ADD}>+ Add a courier</option>
          </Select>
        </div>
        <div>
          <label style={label} htmlFor={`${idPrefix}-number`}>Tracking number</label>
          <input id={`${idPrefix}-number`} className="input-field" style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
            maxLength={40} placeholder={chosen?.needsNumber === false ? 'Not needed' : 'On the courier slip'}
            disabled={!chosen || adding}
            value={value.trackingNumber ?? ''} onChange={(e) => onChange({ ...value, trackingNumber: e.target.value })} />
        </div>
      </div>
      {chosen && chosen.needsNumber !== false && !value.trackingNumber && !adding && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>No number yet? Send it now and add the number on the order later.</div>
      )}

      {adding && (
        <div role="group" aria-label="Add a courier" style={{ border: '1px dashed var(--border-light)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
          {(data?.suggestions ?? []).length > 0 && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>Tap one</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.suggestions.map(s => (
                  <button key={s.name} type="button" className="btn-secondary" disabled={add.isPending}
                    style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => save(s)}>{s.name}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 10 }} className="cf-row">
            <div>
              <label style={label} htmlFor={`${idPrefix}-new-name`}>Or type a name</label>
              <input id={`${idPrefix}-new-name`} className="input-field" style={{ width: '100%' }} maxLength={40} placeholder="Professional Couriers"
                value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label style={label} htmlFor={`${idPrefix}-new-link`}>Tracking page (optional)</label>
              <input id={`${idPrefix}-new-link`} className="input-field" style={{ width: '100%' }} maxLength={300} placeholder="https://"
                value={draft.trackingLink} onChange={(e) => setDraft(d => ({ ...d, trackingLink: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)} disabled={add.isPending}>Cancel</button>
            <button type="button" className="btn-primary" disabled={add.isPending || !draft.name.trim()}
              onClick={() => save({ name: draft.name, trackingLink: draft.trackingLink })}>Add courier</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What the server wants with a new dispatch: null when no courier was chosen. */
export const courierForDispatch = (v) =>
  v?.courierId ? { courierId: v.courierId, trackingNumber: (v.trackingNumber ?? '').trim() || null } : null;
