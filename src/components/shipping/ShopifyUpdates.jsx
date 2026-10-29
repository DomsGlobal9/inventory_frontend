import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * What the Shopify store has been told about this order (29 Oct 2026).
 *
 * The shop ships Shopify orders through ScaleEzy Logistics, never Shopify's own shipping, so Shopify
 * is told by the server: shipped with the tracking (Shopify then emails the customer), the delivery
 * progress, and paid when the courier collected cash on delivery. One card, short: the shipment, the
 * latest delivery news, the payment, and anything the shop has to do. Only on Shopify orders.
 */
const EVENT_WORDS = {
  CARRIER_PICKED_UP: 'Picked up', IN_TRANSIT: 'On the way', OUT_FOR_DELIVERY: 'Out for delivery',
  ATTEMPTED_DELIVERY: 'Delivery attempt failed', DELIVERED: 'Delivered', FAILURE: 'Not delivered'
};
const day = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Said three ways: done, on its way (PENDING), or not done (failed, skipped, waiting for permission). */
function say(u) {
  const ev = EVENT_WORDS[u.event] ?? u.event;
  const words = {
    FULFIL: [`Marked shipped${u.tracking ? `, tracking ${u.tracking}` : ''}. Shopify emailed the customer.`, 'Marking it shipped on Shopify', 'Not marked shipped on Shopify'],
    TRACKING: [`Tracking changed to ${u.tracking}`, `Changing the tracking to ${u.tracking}`, `Tracking not changed to ${u.tracking} on Shopify`],
    EVENT: [`Delivery update: ${ev}`, `Sending the delivery update: ${ev}`, `Delivery update not sent: ${ev}`],
    CANCEL: ['Shipment cancelled on Shopify', 'Cancelling the shipment on Shopify', 'Shipment not cancelled on Shopify'],
    MARK_PAID: ['Marked paid (cash collected on delivery)', 'Marking it paid on Shopify', 'Not marked paid on Shopify']
  }[u.kind];
  if (!words) return null;
  return u.state === 'DONE' ? words[0] : u.state === 'PENDING' ? words[1] : words[2];
}

export default function ShopifyUpdates({ order, canRetry }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const all = order.shopifyUpdates ?? [];
  if (!all.length) return null;

  // Notices first (something to check), then what was said; of the delivery events only the latest.
  const notices = all.filter(u => u.state === 'NOTICE');
  const events = all.filter(u => u.kind === 'EVENT' && u.state === 'DONE');
  const latestEvent = events[events.length - 1];
  const rest = all.filter(u => u.state !== 'NOTICE' && !(u.kind === 'EVENT' && u.state === 'DONE'));
  const shown = [...rest, ...(latestEvent ? [latestEvent] : [])].sort((a, b) => String(a.at).localeCompare(String(b.at)));

  const retry = async (u) => {
    setBusy(u.id);
    try {
      await api.post(`/sales-orders/${order.id}/shopify-updates/${u.id}/retry`);
      toast.success('Shopify will be told again in a moment.');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['sales-orders', order.id] }), 1500);
    } catch (e) {
      toast.error(e?.message || 'That could not be tried again just now.');
    } finally { setBusy(null); }
  };

  return (
    <div className="card su" aria-label="Shopify">
      <h3>Shopify</h3>
      <p className="su-sub">What your Shopify store has been told about this order.</p>
      {notices.map(u => (
        <div key={u.id} className="su-notice" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{u.note}</span>
        </div>
      ))}
      <ul className="su-list">
        {shown.map(u => {
          const done = u.state === 'DONE', waiting = u.state === 'PENDING', stuck = ['FAILED', 'SKIPPED', 'WAITING_PERMISSION'].includes(u.state);
          return (
            <li key={u.id} className={`su-row ${stuck ? 'stuck' : ''}`}>
              <span className="su-icon" aria-hidden="true">
                {done ? <CheckCircle2 size={16} /> : waiting ? <Clock size={16} /> : <AlertTriangle size={16} />}
              </span>
              <div className="su-what">
                <div>{say(u)}{done && u.kind === 'EVENT' && events.length > 1 ? <span className="su-muted"> ({events.length} updates so far)</span> : null}</div>
                {/* The reason, when it did not go -- or a note on one that did ("already paid there"). */}
                {u.note && <div className={stuck ? 'su-why' : 'su-muted'}>{u.note}{u.state === 'WAITING_PERMISSION' && <> <Link to="/settings?section=STOREFRONT">Open Shopify settings</Link></>}</div>}
                <div className="su-muted">{waiting ? 'In a moment' : day(u.at)}</div>
              </div>
              {canRetry && (u.state === 'FAILED' || u.state === 'SKIPPED') && (
                <button type="button" className="btn-secondary su-btn" disabled={busy === u.id} onClick={() => retry(u)}>
                  {busy === u.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Try again
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
