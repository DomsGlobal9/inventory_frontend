import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Truck, ExternalLink, Copy, CheckCircle2, MessageCircle, Pencil, Printer } from 'lucide-react';
import CourierFields, { courierForDispatch } from './CourierFields';
import { useParcelChange } from '../../hooks/useShipping';
import { usePermission } from '../../hooks/usePermission';
import { buildWhatsAppUrl } from '../../utils/whatsappUtils';

/**
 * The order's parcels: each dispatch, who carried it, its tracking number, and whether it arrived.
 *
 * Not shown for a till or counter bill -- those are handed over in the shop, there is no parcel.
 * Tracking: a courier page that takes the number in its link opens straight on the parcel; any
 * other opens its tracking page with the number already copied, said in a toast.
 */
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

export default function Parcels({ order }) {
  const { can } = usePermission();
  const mayEdit = can('dispatch:create');
  const change = useParcelChange(order.id);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const parcels = order.parcels ?? [];
  if (!parcels.length) return null;
  const phone = order.customerPhone || order.customer?.phone;
  const name = order.customerName || order.customer?.name;

  const track = async (p) => {
    if (p.copyNumber && p.trackingNumber) {
      const ok = await copy(p.trackingNumber);
      if (ok) toast.success(`Tracking number copied. Paste it on ${p.courierName}'s page.`);
    }
    window.open(p.trackingUrl, '_blank', 'noopener');
  };
  const startEdit = (p) => { setEditing(p.id); setDraft({ courierId: p.courierId ?? '', trackingNumber: p.trackingNumber ?? '' }); };
  const save = (p) => {
    const body = courierForDispatch(draft);
    change.mutate(body ? { id: p.id, ...body } : { id: p.id, courierId: null }, {
      onSuccess: () => { setEditing(null); toast.success('Saved'); }
    });
  };
  // The label for the box: its own page, printed at 4 × 6 inches (pages/sales/ParcelLabel).
  const printLabel = (p) => window.open(`/dispatches/${p.id}/label?print=1`, '_blank', 'noopener');
  const labelButton = (p) => (
    <button type="button" className="btn-secondary" onClick={() => printLabel(p)} style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Printer size={14} /> Print label
    </button>
  );
  const message = (p) => `Hello${name ? ` ${name}` : ''}, your order ${order.orderNumber} is on its way with ${p.courierName}.`
    + (p.trackingNumber ? ` Tracking number: ${p.trackingNumber}.` : '')
    + (p.trackingUrl ? ` Track it here: ${p.trackingUrl}` : '');

  return (
    <div className="card" style={{ padding: 24 }} aria-label="Parcels">
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Truck size={18} /> {parcels.length === 1 ? 'Parcel' : `Parcels (${parcels.length})`}
      </h3>
      {parcels.map((p, i) => {
        const delivered = p.status === 'DELIVERED';
        const wa = p.courierName && buildWhatsAppUrl(phone, message(p));
        return (
          <div key={p.id} data-parcel={p.dispatchNumber} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border-light)' : 'none', display: 'grid', gap: 8, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {p.dispatchNumber} · {p.pieces} {p.pieces === 1 ? 'piece' : 'pieces'} · sent {day(p.sentAt)}
              </span>
              {p.courierName && (
                <span data-state={delivered ? 'delivered' : 'on-the-way'} style={{ fontSize: 12, fontWeight: 600, color: delivered ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                  {delivered ? `Delivered ${day(p.deliveredAt)}` : 'On the way'}
                </span>
              )}
            </div>

            {editing === p.id ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <CourierFields value={draft} onChange={setDraft} idPrefix={`pc-${i}`} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(null)} disabled={change.isPending}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={() => save(p)} disabled={change.isPending || draft.courierId === undefined}>Save</button>
                </div>
              </div>
            ) : p.courierName ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b>{p.courierName}</b>
                  {p.trackingNumber
                    ? <span style={{ fontFamily: 'var(--font-mono)' }} data-tracking>{p.trackingNumber}</span>
                    : p.needsNumber && <span style={{ color: 'var(--accent-warning)', fontSize: 13 }}>No tracking number yet</span>}
                  {p.trackingNumber && (
                    <button type="button" aria-label="Copy tracking number" title="Copy" className="btn-ghost-icon"
                      onClick={async () => { if (await copy(p.trackingNumber)) toast.success('Copied'); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, display: 'inline-flex' }}>
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {labelButton(p)}
                  {p.trackingUrl && (
                    <button type="button" className="btn-secondary" onClick={() => track(p)} style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ExternalLink size={14} /> Track
                    </button>
                  )}
                  {wa && (
                    <a className="btn-secondary" href={wa} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                      <MessageCircle size={14} /> Send on WhatsApp
                    </a>
                  )}
                  {mayEdit && !delivered && (
                    <button type="button" className="btn-primary" disabled={change.isPending}
                      onClick={() => change.mutate({ id: p.id, delivered: true }, { onSuccess: () => toast.success('Marked delivered') })}
                      style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Mark delivered
                    </button>
                  )}
                  {mayEdit && (
                    <button type="button" className="btn-secondary" onClick={() => startEdit(p)} style={{ padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Pencil size={14} /> {p.trackingNumber || !p.needsNumber ? 'Change' : 'Add tracking number'}
                    </button>
                  )}
                </div>
                {mayEdit && delivered && (
                  <button type="button" onClick={() => change.mutate({ id: p.id, delivered: false }, { onSuccess: () => toast.success('Marked not delivered') })}
                    style={{ justifySelf: 'start', background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>
                    Not delivered yet? Undo
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>No courier written down</span>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {labelButton(p)}
                  {mayEdit && <button type="button" className="btn-secondary" onClick={() => startEdit(p)} style={{ padding: '6px 10px', fontSize: 13 }}>Add courier</button>}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
