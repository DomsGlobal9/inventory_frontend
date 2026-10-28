import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Package, Printer, Truck, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { invalidateDerivedViews } from '../../lib/invalidate';

/**
 * Packing for ScaleEzy Logistics, at the end of a pick walk (28 Oct). Shown instead of "Who is
 * carrying them" when the shop has switched Logistics on.
 *
 * One card per order: choose a box from the shop's sizes, type the weight off the scale, press Packed.
 * That sends the order out (stock leaves from the shelves picked, as "Send out" does) and hands the
 * parcel to Logistics, which books the courier. The label comes back here to print.
 */

/** The shop's Logistics standing and box sizes (null while loading or when not allowed). */
export const useLogistics = (enabled = true) => useQuery({
  queryKey: ['logistics'],
  enabled,
  queryFn: async () => (await api.get('/logistics')).data,
  staleTime: 60_000,
  meta: { quiet: true }
});

const STATUS_WORDS = {
  READY: 'Waiting for Logistics to book the courier…',
  BOOKED: 'Booked', PICKED_UP: 'Picked up', IN_TRANSIT: 'On the way', OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered', FAILED_ATTEMPT: 'Delivery attempt failed', RTO_INITIATED: 'Coming back to you',
  RTO_DELIVERED: 'Returned to you', CANCELLED: 'Cancelled by Logistics', LOST: 'Lost in transit'
};

function ParcelLine({ parcel }) {
  const waiting = parcel.status === 'READY';
  return (
    <div className="sh-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {waiting ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
      <span style={{ flex: 1, minWidth: 180, fontSize: 13 }}>
        {STATUS_WORDS[parcel.status] ?? parcel.status}
        {parcel.courierName ? ` with ${parcel.courierName}` : ''}
        {parcel.awb ? <span className="sh-muted"> · AWB {parcel.awb}</span> : null}
        <span className="sh-muted"> · {parcel.box ?? `${parcel.lengthCm}×${parcel.breadthCm}×${parcel.heightCm} cm`}, {parcel.weightKg} kg</span>
      </span>
      {parcel.labelUrl && (
        <a className="btn-primary" href={parcel.labelUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minHeight: 40 }}>
          <Printer size={15} /> Print label
        </a>
      )}
    </div>
  );
}

function PackCard({ order, lines, boxes, onPacked }) {
  const [box, setBox] = useState(boxes.find(b => b.name === 'Medium')?.name ?? boxes[0]?.name ?? '');
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState(null);
  const pieces = lines.reduce((n, l) => n + l.quantity, 0);

  const pack = async () => {
    const kg = Number(String(weight).replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= 0) { setSaid('Weigh the parcel and enter its weight in kg.'); return; }
    setBusy(true); setSaid(null);
    try {
      await api.post('/logistics/parcels', { salesOrderId: order.id, items: lines, box, weightKg: kg });
      toast.success(`${order.orderNumber} packed and sent to Logistics.`);
      onPacked(order.id);
    } catch (err) {
      setSaid(err?.message || 'That could not be packed. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <strong>{order.orderNumber}</strong>
        <span className="sh-muted" style={{ fontSize: 13 }}>{order.customer ?? ''}{order.customer ? ' · ' : ''}{pieces} {pieces === 1 ? 'piece' : 'pieces'} picked</span>
      </div>
      <div role="radiogroup" aria-label={`Box for ${order.orderNumber}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6 }}>
        {boxes.map(b => (
          <button key={b.id} type="button" role="radio" aria-checked={box === b.name} onClick={() => { setBox(b.name); setSaid(null); }}
            className={box === b.name ? 'btn-primary' : 'btn-secondary'} style={{ minHeight: 48, display: 'grid', lineHeight: 1.2, padding: '6px 4px' }}>
            <span>{b.name}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{b.lengthCm}×{b.breadthCm}×{b.heightCm}</span>
          </button>
        ))}
      </div>
      <label style={{ display: 'grid', gap: 4 }}>
        <span className="sh-muted" style={{ fontSize: 12 }}>Weight on the scale</span>
        <span className="sh-row" style={{ gap: 8 }}>
          <input className="input-field" inputMode="decimal" placeholder="0.72" value={weight} onChange={e => { setWeight(e.target.value); setSaid(null); }}
            aria-label={`Weight in kg for ${order.orderNumber}`} style={{ flex: 1, minWidth: 0 }} />
          <span>kg</span>
        </span>
      </label>
      {said && <span role="alert" style={{ color: 'var(--accent-danger)', fontSize: 13 }}>{said}</span>}
      <button type="button" className="btn-primary" disabled={busy || pieces === 0} onClick={pack}
        style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Package size={17} />} Packed — send to Logistics
      </button>
    </div>
  );
}

/**
 * `orders`: the walk's orders; `linesOf(orderId)`: what was picked for it, as a dispatch takes it.
 * `onAllDone`: leave the walk once every order with picked pieces is packed.
 */
export default function PackOrders({ orders, linesOf, boxes, onAllDone }) {
  const queryClient = useQueryClient();
  const [packed, setPacked] = useState([]);
  const parcels = useQuery({
    queryKey: ['logistics', 'parcels', packed],
    enabled: packed.length > 0,
    queryFn: async () => (await api.get('/logistics/parcels', { params: { orderIds: packed.join(',') } })).data,
    // Waiting for Logistics to book and send the label back.
    refetchInterval: (q) => ((q.state.data ?? []).some(p => !p.labelUrl && ['READY', 'BOOKED'].includes(p.status)) ? 5000 : false),
    meta: { quiet: true }
  });
  const toPack = orders.filter(o => linesOf(o.id).length > 0);
  const left = toPack.filter(o => !packed.includes(o.id));

  const onPacked = (id) => {
    setPacked(p => [...p, id]);
    invalidateDerivedViews(queryClient);
    queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    // NOT the pick list: asked again now, it answers "SO-… is dispatched, nothing to pick" and that
    // replaces the walk -- and the label this card is waiting for. Refreshed once the walk is left.
  };
  const finish = () => {
    onAllDone();
    queryClient.invalidateQueries({ queryKey: ['shelves'] });
  };

  return (
    <section className="sh-card" style={{ display: 'grid', gap: 12 }} aria-label="Pack for Logistics">
      <h3 className="sh-section-title" style={{ margin: 0 }}>Pack each order</h3>
      <span className="sh-muted" style={{ fontSize: 13, marginTop: -6 }}>Choose the box, weigh it, press Packed. Logistics books the courier and the label appears here.</span>
      {toPack.map(o => packed.includes(o.id) ? (
        <div key={o.id} style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
          <span className="sh-row" style={{ gap: 8 }}><CheckCircle2 size={16} color="var(--accent-success)" /><strong>{o.orderNumber}</strong> <span className="sh-muted">packed</span></span>
          {(parcels.data ?? []).filter(p => p.salesOrderId === o.id).map(p => <ParcelLine key={p.id} parcel={p} />)}
        </div>
      ) : (
        <PackCard key={o.id} order={o} lines={linesOf(o.id)} boxes={boxes} onPacked={onPacked} />
      ))}
      {packed.length > 0 && left.length === 0 && (
        <button type="button" className="btn-secondary" onClick={finish} style={{ minHeight: 44 }}>All packed — back to orders</button>
      )}
    </section>
  );
}
