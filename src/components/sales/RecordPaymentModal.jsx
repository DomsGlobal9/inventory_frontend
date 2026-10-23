import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useRecordPayment } from '../../hooks/useSalesOrders';
import { formatINRExact } from '../../utils/formatUtils';

/**
 * Record money collected later against an order: pay on delivery, or an order typed in by hand
 * (services/order-payments). The amount starts at what is due and can be less, never more. Cash can
 * say what was handed over, to show the change; the others keep a reference (UPI number, last 4 of the
 * card, cheque number), never a card number.
 *
 * One key per opening of this box: a double tap, or Save again after a lost answer, records the money
 * once (the server keeps the first).
 */
const METHODS = [
  { k: 'CASH', label: 'Cash' }, { k: 'UPI', label: 'UPI' }, { k: 'CARD', label: 'Card' },
  { k: 'BANK_TRANSFER', label: 'Bank transfer' }, { k: 'CHEQUE', label: 'Cheque' }
];
const REF_HINT = { UPI: 'UPI reference number', CARD: 'Last 4 digits or approval code', BANK_TRANSFER: 'Transfer reference', CHEQUE: 'Cheque number' };

export default function RecordPaymentModal({ order, onClose }) {
  const due = Number(order.payment?.due ?? 0);
  const [method, setMethod] = React.useState('CASH');
  const [amount, setAmount] = React.useState(String(due));
  const [given, setGiven] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [problem, setProblem] = React.useState('');
  const key = React.useMemo(() => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`), []);
  const record = useRecordPayment(order.id);
  const box = React.useRef(null);

  React.useEffect(() => {
    box.current?.querySelector('input')?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !record.isPending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, record.isPending]);

  const n = (s) => Number(String(s).replace(/[^\d.]/g, ''));
  const amt = n(amount);
  const change = method === 'CASH' && given !== '' ? n(given) - amt : null;

  const save = () => {
    if (!(amt > 0)) return setProblem('Enter the amount collected.');
    if (amt > due + 0.001) return setProblem(`That is more than the ${formatINRExact(due)} due.`);
    if (change !== null && change < 0) return setProblem('The cash handed over is less than the amount.');
    setProblem('');
    record.mutate(
      { method, amount: Math.round(amt * 100) / 100, cashReceived: change !== null ? n(given) : null, reference: method === 'CASH' ? null : reference.trim() || null, key },
      { onSuccess: onClose }
    );
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !record.isPending) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="record-payment-title" className="card"
        style={{ width: 440, maxWidth: '100%', padding: 24, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 id="record-payment-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Record payment</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{order.orderNumber} · {formatINRExact(due)} due</div>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close" style={{ padding: 6 }} disabled={record.isPending}><X size={16} /></button>
        </div>

        <div role="radiogroup" aria-label="How it was paid" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.map(m => (
            <button key={m.k} type="button" role="radio" aria-checked={method === m.k} onClick={() => { setMethod(m.k); setProblem(''); }}
              className={method === m.k ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 14px', fontSize: 14 }}>{m.label}</button>
          ))}
        </div>

        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Amount collected (₹)
          <input className="input-field" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setProblem(''); }} />
        </label>

        {method === 'CASH' ? (
          <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
            Cash handed over (₹, optional)
            <input className="input-field" inputMode="decimal" value={given} onChange={(e) => { setGiven(e.target.value); setProblem(''); }} placeholder={String(amt || '')} />
            {change !== null && change >= 0 && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Give back {formatINRExact(change)}</span>}
          </label>
        ) : (
          <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
            {REF_HINT[method]} (optional)
            <input className="input-field" maxLength={40} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
        )}

        {problem && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-danger)' }}>{problem}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Counted in today's Day Book, at this order's store.</div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={record.isPending}>Cancel</button>
          <button type="button" className="btn-primary" onClick={save} disabled={record.isPending}>
            {record.isPending ? 'Saving…' : `Record ${amt > 0 ? formatINRExact(amt) : 'payment'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
