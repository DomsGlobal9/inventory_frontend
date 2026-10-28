import React from 'react';
import toast from 'react-hot-toast';
import { Truck, ExternalLink, Copy, MessageCircle, Printer, Loader2 } from 'lucide-react';
import { buildWhatsAppUrl } from '../../utils/whatsappUtils';

/**
 * An order's parcels, read-only (28 Oct 2026).
 *
 * Shipping is done by ScaleEzy Logistics: it books the courier through Shiprocket, makes the label and
 * reports pickup and delivery, all of which lands here. Inventory no longer chooses couriers, types
 * tracking numbers, marks parcels delivered or prints its own labels. Parcels sent before, and
 * Shopify's own fulfilments, still show who carried them.
 */
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

const LOGISTICS_WORDS = {
  READY: 'Packed — waiting for Logistics to book the courier',
  BOOKED: 'Booked', PICKED_UP: 'Picked up', IN_TRANSIT: 'On the way', OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered', FAILED_ATTEMPT: 'Delivery attempt failed', RTO_INITIATED: 'Coming back to you',
  RTO_DELIVERED: 'Returned to you — check it in from Returns', CANCELLED: 'Cancelled by Logistics', LOST: 'Lost in transit'
};

export default function Parcels({ order }) {
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
  const message = (p) => `Hello${name ? ` ${name}` : ''}, your order ${order.orderNumber} is on its way with ${p.courierName}.`
    + (p.trackingNumber ? ` Tracking number: ${p.trackingNumber}.` : '')
    + (p.trackingUrl ? ` Track it here: ${p.trackingUrl}` : '');
  const small = { padding: '6px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' };

  return (
    <div className="card" style={{ padding: 24 }} aria-label="Parcels">
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Truck size={18} /> {parcels.length === 1 ? 'Parcel' : `Parcels (${parcels.length})`}
      </h3>
      {parcels.map((p, i) => {
        const delivered = p.status === 'DELIVERED';
        const l = p.logistics;
        const wa = p.courierName && buildWhatsAppUrl(phone, message(p));
        return (
          <div key={p.id} data-parcel={p.dispatchNumber} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border-light)' : 'none', display: 'grid', gap: 8, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {p.dispatchNumber} · {p.pieces} {p.pieces === 1 ? 'piece' : 'pieces'} · sent {day(p.sentAt)}
                {l ? ` · ${l.box ?? 'own box'}, ${l.weightKg} kg` : ''}
              </span>
              {(p.courierName || l) && (
                <span data-state={delivered ? 'delivered' : 'on-the-way'} style={{ fontSize: 12, fontWeight: 600, color: delivered ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                  {delivered ? `Delivered ${p.deliveredAt ? day(p.deliveredAt) : ''}` : l ? (LOGISTICS_WORDS[l.status] ?? l.status) : 'On the way'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {p.courierName ? <b>{p.courierName}</b> : l ? (
                  <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Loader2 size={14} className="animate-spin" /> ScaleEzy Logistics is booking the courier</span>
                ) : <span style={{ color: 'var(--text-secondary)' }}>Handed over (no courier)</span>}
                {p.trackingNumber && <span style={{ fontFamily: 'var(--font-mono)' }} data-tracking>{p.trackingNumber}</span>}
                {p.trackingNumber && (
                  <button type="button" aria-label="Copy tracking number" title="Copy" className="btn-ghost-icon"
                    onClick={async () => { if (await copy(p.trackingNumber)) toast.success('Copied'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, display: 'inline-flex' }}>
                    <Copy size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {l?.labelUrl && (
                  <a className="btn-secondary" href={l.labelUrl} target="_blank" rel="noopener noreferrer" style={small}><Printer size={14} /> Print label</a>
                )}
                {p.trackingUrl && (
                  <button type="button" className="btn-secondary" onClick={() => track(p)} style={small}><ExternalLink size={14} /> Track</button>
                )}
                {wa && (
                  <a className="btn-secondary" href={wa} target="_blank" rel="noopener noreferrer" style={small}><MessageCircle size={14} /> Send on WhatsApp</a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
