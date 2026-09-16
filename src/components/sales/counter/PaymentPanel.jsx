import React from 'react';
import { Banknote, Smartphone, CreditCard, Split, Plus, X } from 'lucide-react';
import { formatINRExact } from '../../../utils/formatUtils';

export const paise = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
const rupees = (p) => formatINRExact(p / 100);

export const EMPTY_PAYMENT = { mode: 'CASH', cashReceived: '', reference: '', rows: [{ method: 'UPI', amount: '', cashReceived: '', reference: '' }, { method: 'CASH', amount: '', cashReceived: '', reference: '' }] };

const METHODS = [
  { key: 'CASH', label: 'Cash', icon: Banknote },
  { key: 'UPI', label: 'UPI', icon: Smartphone },
  { key: 'CARD', label: 'Card', icon: CreditCard },
  { key: 'SPLIT', label: 'Split', icon: Split }
];

const looksLikeCardNumber = (ref) => /\d{12,}/.test(String(ref || '').replace(/[\s-]/g, ''));
const moneyText = (v) => /^\d*(\.\d{0,2})?$/.test(String(v).replace(/,/g, ''));

/**
 * What the screen will send as payments for a bill of `totalPaise`, or the first thing stopping it.
 *
 * The same rules the server applies (services/payments/payment-rules.ts) so the cashier is told
 * before pressing the button. The server still decides.
 */
export function buildPayments(totalPaise, payment) {
  if (totalPaise <= 0) return { rows: [], problem: null, changePaise: 0 };
  const { mode } = payment;

  if (mode === 'CASH') {
    if (payment.cashReceived === '' || payment.cashReceived === null) {
      return { rows: [{ method: 'CASH', amount: totalPaise / 100 }], problem: null, changePaise: 0 };
    }
    const got = paise(payment.cashReceived);
    if (!moneyText(payment.cashReceived) || Number.isNaN(got)) return { rows: [], problem: 'Enter the cash received as an amount.' };
    if (got < totalPaise) return { rows: [], problem: `Cash received is ${rupees(totalPaise - got)} short.` };
    return { rows: [{ method: 'CASH', amount: totalPaise / 100, cashReceived: got / 100 }], problem: null, changePaise: got - totalPaise };
  }

  if (mode === 'UPI' || mode === 'CARD') {
    if (mode === 'CARD' && looksLikeCardNumber(payment.reference)) {
      return { rows: [], problem: 'Never type the card number. Use the last 4 digits or the approval code.' };
    }
    return { rows: [{ method: mode, amount: totalPaise / 100, reference: payment.reference?.trim() || null }], problem: null, changePaise: 0 };
  }

  // Split
  const rows = [];
  let sum = 0;
  let change = 0;
  let cashRows = 0;
  for (const row of payment.rows) {
    if (row.amount === '' || row.amount === null) continue;
    const amount = paise(row.amount);
    if (!moneyText(row.amount) || Number.isNaN(amount) || amount <= 0) return { rows: [], problem: 'Each split amount has to be more than ₹0.' };
    const out = { method: row.method, amount: amount / 100 };
    if (row.method === 'CASH') {
      cashRows += 1;
      if (row.cashReceived !== '' && row.cashReceived !== null && row.cashReceived !== undefined) {
        const got = paise(row.cashReceived);
        if (Number.isNaN(got) || got < amount) return { rows: [], problem: 'Cash received is less than the cash part.' };
        out.cashReceived = got / 100;
        change = got - amount;
      }
    } else if (row.reference?.trim()) {
      if (row.method === 'CARD' && looksLikeCardNumber(row.reference)) return { rows: [], problem: 'Never type the card number. Use the last 4 digits or the approval code.' };
      out.reference = row.reference.trim();
    }
    sum += amount;
    rows.push(out);
  }
  if (cashRows > 1) return { rows: [], problem: 'Put all the cash in one row.' };
  if (rows.length === 0) return { rows: [], problem: 'Enter how the bill is split.' };
  if (sum < totalPaise) return { rows: [], problem: `${rupees(totalPaise - sum)} still to split.` };
  if (sum > totalPaise) return { rows: [], problem: `The split is ${rupees(sum - totalPaise)} more than the bill. Give change in cash instead.` };
  return { rows, problem: null, changePaise: change };
}

export default function PaymentPanel({ totalPaise, payment, onChange, disabled }) {
  const set = (patch) => onChange({ ...payment, ...patch });
  const setRow = (i, patch) => set({ rows: payment.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const plan = buildPayments(totalPaise, payment);
  const splitSum = payment.rows.reduce((s, r) => s + (Number.isNaN(paise(r.amount)) ? 0 : paise(r.amount) || 0), 0);

  if (totalPaise <= 0) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nothing to pay on this bill.</div>;
  }

  const moneyInput = (value, onValue, label, extra = {}) => (
    <input
      className="input-field"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      aria-label={label}
      placeholder={label}
      onChange={(e) => { if (moneyText(e.target.value)) onValue(e.target.value); }}
      style={{ width: '100%', ...extra }}
    />
  );

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div role="radiogroup" aria-label="How is it paid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {METHODS.map(({ key, label, icon: Icon }) => {
          const on = payment.mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => set({ mode: key })}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 10,
                border: `1px solid ${on ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                background: on ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: on ? 600 : 400
              }}
            >
              <Icon size={18} /> {label}
            </button>
          );
        })}
      </div>

      {payment.mode === 'CASH' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <label className="input-label" style={{ fontSize: 13 }}>Cash received (leave empty if exact)</label>
          {moneyInput(payment.cashReceived, (v) => set({ cashReceived: v }), `e.g. ${Math.ceil(totalPaise / 50000) * 500}`)}
          {plan.changePaise > 0 && (
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-success)' }}>Give back {rupees(plan.changePaise)}</div>
          )}
        </div>
      )}

      {(payment.mode === 'UPI' || payment.mode === 'CARD') && (
        <div style={{ display: 'grid', gap: 6 }}>
          <label className="input-label" style={{ fontSize: 13 }}>
            {payment.mode === 'UPI' ? 'UPI reference / UTR (optional)' : 'Last 4 digits or approval code (optional)'}
          </label>
          <input
            className="input-field"
            value={payment.reference}
            disabled={disabled}
            maxLength={40}
            onChange={(e) => set({ reference: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {payment.mode === 'SPLIT' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {payment.rows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 100px) 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <select className="input-field" value={row.method} disabled={disabled} aria-label="Method"
                onChange={(e) => setRow(i, { method: e.target.value, cashReceived: '', reference: '' })}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
              {moneyInput(row.amount, (v) => setRow(i, { amount: v }), 'Amount')}
              {row.method === 'CASH'
                ? moneyInput(row.cashReceived, (v) => setRow(i, { cashReceived: v }), 'Received')
                : <input className="input-field" value={row.reference} disabled={disabled} maxLength={40} placeholder={row.method === 'UPI' ? 'UTR' : 'Last 4'} aria-label="Reference" onChange={(e) => setRow(i, { reference: e.target.value })} style={{ width: '100%' }} />}
              <button type="button" className="btn-icon" aria-label="Remove this part" disabled={disabled || payment.rows.length <= 1}
                onClick={() => set({ rows: payment.rows.filter((_, j) => j !== i) })}><X size={16} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" disabled={disabled || payment.rows.length >= 6}
              onClick={() => set({ rows: [...payment.rows, { method: 'UPI', amount: '', cashReceived: '', reference: '' }] })}
              style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 12px', fontSize: 13 }}>
              <Plus size={14} /> Add part
            </button>
            {splitSum < totalPaise && (
              <button type="button" className="btn-secondary" disabled={disabled}
                onClick={() => {
                  const i = payment.rows.findIndex(r => r.amount === '');
                  const rest = ((totalPaise - splitSum) / 100).toFixed(2);
                  if (i >= 0) setRow(i, { amount: rest });
                  else set({ rows: [...payment.rows, { method: 'CASH', amount: rest, cashReceived: '', reference: '' }] });
                }}
                style={{ padding: '6px 12px', fontSize: 13 }}>
                Fill the rest ({rupees(totalPaise - splitSum)})
              </button>
            )}
          </div>
          {plan.changePaise > 0 && <div style={{ fontWeight: 700, color: 'var(--accent-success)' }}>Give back {rupees(plan.changePaise)}</div>}
        </div>
      )}

      {plan.problem && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-warning)' }}>{plan.problem}</div>}
    </div>
  );
}
