import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { useStoreCredit, usePayOutCredit } from '../../hooks/useCounterReturn';
import { usePermission } from '../../hooks/usePermission';
import { formatINRExact } from '../../utils/formatUtils';

/**
 * A customer's store credit: what returns and exchanges left them to spend, every change, and --
 * for a manager -- paying it out in money when the shop agrees to.
 */
const dateOf = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function StoreCreditCard({ customerId }) {
  const { can } = usePermission();
  const { data } = useStoreCredit(customerId);
  const payOut = usePayOutCredit(customerId);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ amount: '', method: 'CASH', nonce: '' });

  if (!data || (data.credit === 0 && data.entries.length === 0)) return null;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await payOut.mutateAsync({ amount: Number(f.amount), method: f.method, nonce: f.nonce });
      setOpen(false);
      toast.success(`Paid out ${formatINRExact(Number(f.amount))} in ${f.method === 'CASH' ? 'cash' : 'UPI'}.`);
    } catch (err) { toast.error(err?.message || 'Could not pay out the credit.'); }
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Wallet size={16} /> Store credit</h3>
      <div style={{ fontSize: '28px', fontWeight: 600 }}>{formatINRExact(data.credit)}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>to spend in the shop. It shows at New sale when their number is typed.</div>
      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.entries.slice(0, 6).map(e => (
          <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}>
            <span style={{ minWidth: 0 }}>
              {e.label}
              {e.returnNumber && <> · <Link to={`/returns/${e.returnId}`}>{e.returnNumber}</Link></>}
              {!e.returnNumber && e.orderNumber && <> · <Link to={`/orders/${e.orderId}`}>{e.orderNumber}</Link></>}
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px' }}>{dateOf(e.at)}{e.note ? ` · ${e.note}` : ''}</span>
            </span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', color: e.amount < 0 ? 'rgb(185,28,28)' : 'rgb(21,128,61)' }}>{e.amount > 0 ? '+' : '−'}{formatINRExact(Math.abs(e.amount))}</span>
          </li>
        ))}
      </ul>
      {can('return:complete') && data.credit > 0 && !open && (
        <button className="btn-secondary" style={{ marginTop: '12px', padding: '4px 12px', fontSize: '13px' }}
          onClick={() => { setF({ amount: String(data.credit), method: 'CASH', nonce: crypto.randomUUID() }); setOpen(true); }}>Pay out in money</button>
      )}
      {open && (
        <form onSubmit={submit} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>₹</span>
            <input className="input-field" inputMode="decimal" aria-label="Amount to pay out" value={f.amount}
              onChange={(e) => { if (/^\d*(\.\d{0,2})?$/.test(e.target.value)) setF(p => ({ ...p, amount: e.target.value })); }} style={{ width: '120px' }} />
            {['CASH', 'UPI'].map(m => (
              <button key={m} type="button" aria-pressed={f.method === m} className={f.method === m ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => setF(p => ({ ...p, method: m }))}>{m === 'CASH' ? 'Cash' : 'UPI'}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-primary" disabled={payOut.isPending || !(Number(f.amount) > 0)} style={{ padding: '6px 14px' }}>{payOut.isPending ? 'Paying…' : 'Pay out'}</button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} style={{ padding: '6px 14px' }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
