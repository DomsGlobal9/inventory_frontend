import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useUpiClaims, useUpiDecision } from '../../hooks/useOnlineShop';
import { formatINRExact } from '../../utils/formatUtils';
import { usePermission } from '../../hooks/usePermission';

/**
 * On an online order paid by UPI straight to the shop (26 Nov 2026): the payment to check, and the two answers.
 * "Payment received" records it (UPI, with its reference) and tells the customer; "Not received" asks the customer
 * on WhatsApp and cancels the order after a day unless it is marked received meanwhile. Shipping waits until received.
 */
const facts = { display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 12px', fontSize: '13.5px', margin: '12px 0' };
const muted = { color: 'var(--text-secondary)' };

export default function UpiCheck({ salesOrderId }) {
  const { can } = usePermission();
  const allowed = can('admin:online_shop');
  const { data } = useUpiClaims(salesOrderId, allowed);
  const decide = useUpiDecision();
  const [asking, setAsking] = useState(false);
  const c = data?.[0];
  if (!allowed || !c) return null;

  const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
  const go = (received) => decide.mutate({ id: c.id, received }, {
    onSuccess: () => { setAsking(false); toast.success(received ? 'Payment recorded. The customer has been told.' : 'Marked not received. The customer has been asked to check.', { id: `upi-${c.id}` }); },
    onError: (e) => toast.error(e?.response?.data?.message || e?.message || 'That could not be saved. Please try again.', { id: `upi-${c.id}` })
  });

  const head = c.status === 'RECEIVED' ? 'UPI payment received'
    : c.status === 'NOT_RECEIVED' ? 'UPI payment not found'
    : c.status === 'TO_CHECK' ? 'UPI payment to check'
    : c.status === 'AWAITING' ? 'Waiting for the customer to pay by UPI'
    : 'UPI payment: order not completed';

  return (
    <div className="card" style={{ padding: '24px', borderLeft: c.status === 'TO_CHECK' ? '3px solid var(--accent-warning, #d97706)' : c.status === 'NOT_RECEIVED' ? '3px solid var(--accent-danger, #b42318)' : undefined }}>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{head}</h3>
      <div style={facts}>
        <span style={muted}>Amount</span><b>{formatINRExact(c.amount)}</b>
        <span style={muted}>UPI reference</span><b style={{ fontFamily: 'ui-monospace, Consolas, monospace', letterSpacing: '.5px' }}>{c.utr ? c.utr.replace(/(\d{4})(?=\d)/g, '$1 ') : 'Not given yet'}</b>
        <span style={muted}>To</span><span>{c.upiId}</span>
        <span style={muted}>{c.status === 'RECEIVED' || c.status === 'NOT_RECEIVED' ? 'Decided' : 'Customer said paid'}</span>
        <span>{c.status === 'RECEIVED' || c.status === 'NOT_RECEIVED' ? when(c.decidedAt) : when(c.claimedAt)}</span>
      </div>

      {c.status === 'TO_CHECK' && <p style={{ ...muted, fontSize: '13px', margin: '0 0 12px' }}>Open your bank or UPI app and look for {formatINRExact(c.amount)} with this reference. The order is not sent until you press Payment received.</p>}
      {c.status === 'AWAITING' && <p style={{ ...muted, fontSize: '13px', margin: '0 0 12px' }}>The customer has not given a payment reference yet. If it does not come by {when(c.expiresAt)}, the order is cancelled and its pieces go back on sale. If the money is already in your account, you can mark it received.</p>}
      {c.status === 'NOT_RECEIVED' && <p style={{ ...muted, fontSize: '13px', margin: '0 0 12px' }}>The customer has been asked on WhatsApp to check. Unless you mark it received, the order is cancelled on {when(c.expiresAt)} and its pieces go back on sale.</p>}

      {(c.status === 'TO_CHECK' || c.status === 'AWAITING' || c.status === 'NOT_RECEIVED') && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-primary" disabled={decide.isPending} onClick={() => go(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {decide.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Payment received
          </button>
          {c.status !== 'NOT_RECEIVED' && (asking ? (
            <>
              <button type="button" className="btn-secondary" style={{ color: 'var(--accent-danger, #b42318)' }} disabled={decide.isPending} onClick={() => go(false)}>Yes, not received</button>
              <button type="button" className="btn-secondary" onClick={() => setAsking(false)}>Cancel</button>
              <span style={{ ...muted, fontSize: '12.5px' }}>The customer is asked to check; the order is cancelled after a day unless the money turns up.</span>
            </>
          ) : (
            <button type="button" className="btn-secondary" style={{ color: 'var(--accent-danger, #b42318)' }} onClick={() => setAsking(true)}>Not received</button>
          ))}
        </div>
      )}
    </div>
  );
}
