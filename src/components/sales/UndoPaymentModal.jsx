import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUndoPayment } from '../../hooks/useSalesOrders';
import { formatINRExact } from '../../utils/formatUtils';

/**
 * Undo a payment recorded by mistake (services/order-payments): the owner says why, and a second row for
 * minus the amount cancels it. Nothing is deleted -- the order keeps both rows, so it is clear what was
 * recorded, what was undone, by whom and why.
 */
const METHOD = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' };

export default function UndoPaymentModal({ order, payment, onClose }) {
  const [reason, setReason] = React.useState('');
  const [problem, setProblem] = React.useState('');
  const undo = useUndoPayment(order.id);
  const box = React.useRef(null);

  React.useEffect(() => {
    box.current?.querySelector('textarea')?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !undo.isPending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, undo.isPending]);

  const save = () => {
    if (reason.trim().length < 5) return setProblem('Say why, in a few words: for example "typed 10,000 instead of 1,000".');
    undo.mutate({ paymentId: payment.id, reason: reason.trim() }, { onSuccess: onClose });
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !undo.isPending) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="undo-payment-title" className="card"
        style={{ width: 440, maxWidth: '100%', padding: 24, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 id="undo-payment-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Undo this payment?</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {order.orderNumber} · {METHOD[payment.method] ?? payment.method} {formatINRExact(Number(payment.amount))} · {new Date(payment.receivedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close" style={{ padding: 6 }} disabled={undo.isPending}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          The payment stays on the order, marked as undone, and {formatINRExact(Number(payment.amount))} is due again. Today's Day Book takes it off.
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Why is it being undone?
          <textarea className="input-field" rows={2} maxLength={110} value={reason} onChange={(e) => { setReason(e.target.value); setProblem(''); }} style={{ resize: 'vertical' }} />
        </label>
        {problem && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-danger)' }}>{problem}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={undo.isPending}>Keep it</button>
          <button type="button" className="btn-primary" onClick={save} disabled={undo.isPending} style={{ background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}>
            {undo.isPending ? 'Undoing…' : 'Undo payment'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
