import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Receipt, ChevronRight, ChevronDown } from 'lucide-react';
import LoadFailed from '../../components/LoadFailed';
import { useAdminTillHealth } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';

/**
 * Bills sent from POS tills, per shop, worst first.
 *
 * A bill Inventory refused, or one stuck in the queue, used to be visible only in server logs.
 * Read-only on purpose: the shop's owner fixes a refused bill from the till (More → Inventory
 * link), which sends it again or leaves it out.
 */

const STATE = {
  STUCK: { text: '✕ Stuck', color: 'var(--accent-danger)' },
  CHECK: { text: '⚠ Check', color: 'rgb(161,98,7)' },
  NO_BILLS: { text: '– No bills', color: 'var(--text-muted)' },
  OK: { text: '✓ OK', color: 'var(--accent-success)' }
};
const KIND = {
  'sale.completed': 'Sale', 'sale.returned': 'Return', 'sale.exchanged': 'Exchange',
  'payment.updated': 'Payment', 'order.written_off': 'Write-off'
};

function ago(at) {
  if (!at) return 'never';
  const mins = Math.round((Date.now() - new Date(at).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}
const when = (at) => new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const cell = { padding: '10px 16px' };

export default function TillHealthPage() {
  const { data, isLoading, isError, error, refetch } = useAdminTillHealth();
  const [open, setOpen] = useState(() => new Set());
  const clients = data?.clients ?? [];
  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Receipt size={22} color="var(--accent-gold)" /> Till link
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Bills sent from POS tills, per shop. Shops that need somebody come first.
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : isError ? (
        <LoadFailed what="till link health" error={error} onRetry={refetch} />
      ) : (
        <div className="table-container" style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'auto hidden', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)' }}>
                {['Shop', 'State', 'Tills', 'Last bill in', 'Waiting', 'Stuck', 'Refused (7 days)'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No shop has connected a till yet.</td></tr>
              )}
              {clients.map(c => {
                const isOpen = open.has(c.clientId);
                const s = STATE[c.state];
                return (
                  <React.Fragment key={c.clientId}>
                    <tr style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={cell}>
                        {c.problems.length > 0 ? (
                          <button type="button" onClick={() => toggle(c.clientId)} aria-expanded={isOpen}
                            aria-label={`${isOpen ? 'Hide' : 'Show'} refused and stuck bills for ${c.clientId}`}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--accent-gold)' }}>
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{c.clientId}
                          </button>
                        ) : (
                          <span style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', paddingLeft: '18px' }}>{c.clientId}</span>
                        )}
                      </td>
                      <td style={{ ...cell, color: s.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.text}</td>
                      <td style={cell}>{c.tills === 0 ? <span style={{ color: 'var(--text-muted)' }}>None now</span> : c.tills}</td>
                      <td style={{ ...cell, color: 'var(--text-secondary)' }} title={c.lastBillAt ? when(c.lastBillAt) : undefined}>{ago(c.lastBillAt)}</td>
                      <td style={cell}>{c.waiting}</td>
                      <td style={{ ...cell, color: c.stuck ? 'var(--accent-danger)' : undefined }}>{c.stuck}</td>
                      <td style={{ ...cell, color: c.refused7d ? 'rgb(161,98,7)' : undefined }}>{c.refused7d}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: '4px 16px 14px 34px', background: 'var(--bg-input)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                              {c.problems.map(p => (
                                <tr key={`${p.kind}:${p.invoiceNo}`} style={{ verticalAlign: 'top' }}>
                                  <td style={{ padding: '6px 10px 6px 0', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.invoiceNo}</td>
                                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{KIND[p.kind] ?? p.kind}</td>
                                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{when(p.receivedAt)}</td>
                                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontWeight: 600, color: p.status === 'REJECTED' ? 'rgb(161,98,7)' : 'var(--accent-danger)' }}>
                                    {p.status === 'REJECTED' ? 'Refused' : 'Stuck'}
                                  </td>
                                  <td style={{ padding: '6px 0 6px 10px', color: 'var(--text-secondary)' }}>
                                    {[p.answer, p.detail].filter(Boolean).join(': ') || '—'}
                                    {p.attempts > 1 && <span style={{ color: 'var(--text-muted)' }}> · tried {p.attempts} times</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Link to={`/platformconsole/clients/${c.clientId}`} style={{ fontSize: '12px', color: 'var(--accent-gold)' }}>Open this shop</Link>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PageGuide title="About Till link">
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Refused:</strong> Inventory would not take the bill, for example an item this shop does not have. The till then holds every later bill behind it and shows <em>Sending to Inventory has stopped</em> at the top. The owner fixes it under More → Inventory link: try again, or leave the bill out.</li>
          <li><strong>Stuck:</strong> a bill that has waited more than 5 minutes, or that Inventory started and stopped hearing about. This is our side, not the shop's: check the backend is running.</li>
          <li><strong>Waiting:</strong> bills received and about to be booked. A few seconds is normal.</li>
          <li><strong>No bills:</strong> a till is connected but has never sent a bill.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
