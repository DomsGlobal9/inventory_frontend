import React, { useState } from 'react';
import { Plus, Star, Trash2, Pencil } from 'lucide-react';
import { useCouriers, useAddCourier, useEditCourier, useRemoveCourier } from '../../hooks/useShipping';
import ConfirmModal from '../ConfirmModal';

/**
 * Settings → Couriers: who the shop sends parcels with.
 *
 * Names and tracking pages only. The default courier is chosen already in Create Dispatch for an
 * order going to an address. A tracking page with {number} in it opens straight on the parcel;
 * without, it opens the page and the app copies the number.
 */
const th = { textAlign: 'left', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const td = { padding: '10px 14px', verticalAlign: 'top' };

export default function CouriersPanel() {
  const { data, isLoading } = useCouriers();
  const add = useAddCourier();
  const edit = useEditCourier();
  const remove = useRemoveCourier();
  const [draft, setDraft] = useState({ name: '', trackingLink: '', needsNumber: true });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const couriers = data?.couriers ?? [];

  const startEdit = (c) => setEditing({ id: c.id, name: c.name, trackingLink: c.trackingLink ?? '', needsNumber: c.needsNumber });

  return (
    <div>
      <h2 style={{ fontSize: 24, margin: '0 0 8px', color: 'var(--text-primary)' }}>Couriers</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 20px' }}>
        Who you send parcels with. When you dispatch an order you choose one and type the tracking number from the slip;
        the order then shows a Track button and you can send the number to the customer on WhatsApp.
      </p>

      {(data?.suggestions ?? []).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="input-label" style={{ marginBottom: 8 }}>Add with one tap</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.suggestions.map(s => (
              <button key={s.name} type="button" className="btn-secondary" disabled={add.isPending} onClick={() => add.mutate(s)}
                style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus size={14} /> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); add.mutate(draft, { onSuccess: () => setDraft({ name: '', trackingLink: '', needsNumber: true }) }); }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }} aria-label="Add a courier">
        <div style={{ flex: '1 1 180px', maxWidth: 240 }}>
          <label className="input-label" htmlFor="co-name">Or type a courier</label>
          <input id="co-name" className="input-field" value={draft.name} maxLength={40} placeholder="Professional Couriers" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        </div>
        <div style={{ flex: '2 1 260px', maxWidth: 420 }}>
          <label className="input-label" htmlFor="co-link">Tracking page (optional)</label>
          <input id="co-link" className="input-field" value={draft.trackingLink} maxLength={300} placeholder="https://" onChange={e => setDraft(d => ({ ...d, trackingLink: e.target.value }))} />
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" checked={!draft.needsNumber} onChange={e => setDraft(d => ({ ...d, needsNumber: !e.target.checked }))} />
          No tracking number (own delivery)
        </label>
        <button type="submit" className="btn-primary" disabled={add.isPending || !draft.name.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add courier
        </button>
      </form>

      {isLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading couriers…</p>
        : couriers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No couriers yet. Tap one above, or add one while dispatching an order.</p>
        ) : (
          <div className="table-container" style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'auto hidden' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ background: 'var(--bg-input)' }}>{['Courier', 'Tracking page', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {couriers.map(c => editing?.id === c.id ? (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border-light)' }} data-courier={c.name}>
                    <td style={td}><input aria-label="Courier name" className="input-field" value={editing.name} maxLength={40} onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} /></td>
                    <td style={td}>
                      <input aria-label="Tracking page" className="input-field" style={{ width: '100%' }} value={editing.trackingLink} maxLength={300} placeholder="https://" onChange={e => setEditing(x => ({ ...x, trackingLink: e.target.value }))} />
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 6 }}>
                        <input type="checkbox" checked={!editing.needsNumber} onChange={e => setEditing(x => ({ ...x, needsNumber: !e.target.checked }))} /> No tracking number
                      </label>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button type="button" className="btn-secondary" onClick={() => setEditing(null)} style={{ marginRight: 6 }}>Cancel</button>
                      <button type="button" className="btn-primary" disabled={edit.isPending || !editing.name.trim()}
                        onClick={() => edit.mutate(editing, { onSuccess: () => setEditing(null) })}>Save</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border-light)' }} data-courier={c.name}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.isDefault
                        ? <span style={{ fontSize: 12, color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="currentColor" /> Default</span>
                        : <button type="button" onClick={() => edit.mutate({ id: c.id, isDefault: true })} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>Make default</button>}
                      {!c.needsNumber && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tracking number</div>}
                    </td>
                    <td style={{ ...td, color: 'var(--text-secondary)', wordBreak: 'break-all', fontSize: 13 }}>
                      {c.trackingLink || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                      {c.trackingLink && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.trackingLink.includes('{number}') ? 'Opens straight on the parcel' : 'Opens the page; the number is copied for pasting'}</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button type="button" aria-label={`Change ${c.name}`} className="btn-secondary" onClick={() => startEdit(c)} style={{ padding: '6px 8px', marginRight: 6 }}><Pencil size={14} /></button>
                      <button type="button" aria-label={`Remove ${c.name}`} className="btn-secondary" onClick={() => setRemoving(c)} style={{ padding: '6px 8px', color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <ConfirmModal
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing.id, { onSettled: () => setRemoving(null) })}
        title={`Remove ${removing?.name ?? ''}?`}
        message="It leaves the Courier list. Parcels already sent with it keep its name and Track button."
        confirmText="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}
