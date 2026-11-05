import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/**
 * What a customer bought before the shop came to ScaleEzy (services/past-purchases): their bills from the
 * shop's earlier records. Read only. These never touch stock, the Day Book, GST or reports, and most have
 * no date, so nothing here says when. The buying pattern worked out from them is shown in CRM, on its
 * customer card (owner, 5 Nov), not here.
 */

export const usePastPurchases = (customerId) => useQuery({
  queryKey: ['customers', customerId, 'past-purchases'],
  queryFn: async () => (await api.get(`/customers/${customerId}/past-purchases`)).data,
  enabled: !!customerId,
  meta: { quiet: true }
});

/** ₹ with paise only when there are any, and a real minus sign for a return. */
const pastMoney = (n) => {
  const v = Number(n) || 0;
  const body = Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `${v < 0 ? '−' : ''}₹${body}`;
};
const PAID = { PAYTM: 'Paytm', CARD: 'Card', CASH: 'Cash', CREDIT: 'Credit', UPI: 'UPI' };
const paidLabel = (p) => !p ? 'Not known' : PAID[String(p).toUpperCase()] ?? p;
export const billsLabel = (n) => `${n} earlier bill${n === 1 ? '' : 's'}`;

/** The same kind at the same price reads once, with how many: "Fancy ₹2,500 × 3". Returns say so. */
function linesOf(bill) {
  const groups = new Map();
  for (const l of bill.lines) {
    const qty = Math.abs(l.quantity) || 1;
    const each = Math.abs(l.amount) / qty;
    const back = l.amount < 0;
    // Whatever the shop's records hold about the item, in its own words.
    const what = [l.title || l.kind, l.craft, l.fabric && !l.title ? l.fabric : null, l.colour, l.size].filter(Boolean).join(', ');
    const key = `${what}|${each}|${back}`;
    const g = groups.get(key);
    if (g) g.qty += qty; else groups.set(key, { what, each, back, qty });
  }
  return [...groups.values()].map(g => `${g.back ? 'Returned: ' : ''}${g.what} ${pastMoney(g.each)}${g.qty > 1 ? ` × ${g.qty}` : ''}`);
}

const head = { padding: '12px 24px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '13px' };
const cell = { padding: '14px 24px', verticalAlign: 'top' };

export function PastBills({ bills }) {
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="phone-cards" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
              <th style={head}>BILL</th>
              <th style={head}>ITEMS</th>
              <th style={head}>PAID BY</th>
              <th style={{ ...head, textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.billNo} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ ...cell, fontWeight: 500 }}>
                  Bill {b.billNo}
                  {b.billedOn && <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>{new Date(b.billedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                </td>
                <td data-label="ITEMS" style={{ ...cell, color: 'var(--text-secondary)' }}>
                  {linesOf(b).map((t, i) => <div key={i}>{t}</div>)}
                  {b.net === 0 && <div style={{ fontSize: '12px' }}>Taken back on the same bill</div>}
                </td>
                <td data-label="PAID BY" style={{ ...cell, color: 'var(--text-secondary)' }}>{paidLabel(b.paidBy)}</td>
                <td data-label="AMOUNT" style={{ ...cell, textAlign: 'right', fontWeight: 500, color: b.net < 0 ? 'var(--accent-danger)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>{pastMoney(b.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: 0, padding: '14px 24px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        From the shop's earlier records{bills.some(b => !b.billedOn) ? ', dates not known' : ''}. Read only: these do not change stock, Day Book, GST or reports.
      </p>
    </>
  );
}
