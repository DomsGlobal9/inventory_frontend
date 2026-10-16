import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Gift, Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useGiftVouchers, useGiftVoucher, useExtendGiftVoucher, useBlockGiftVoucher, useUnblockGiftVoucher } from '../../hooks/useGiftVouchers';
import { usePermission } from '../../hooks/usePermission';
import LoadFailed from '../../components/LoadFailed';

/**
 * Gift vouchers sold at the till: what the shop still owes, each voucher's balance and history.
 * Selling and spending happen at the POS; here staff look up, extend and block.
 */

const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (at) => at ? new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const STATES = { OPEN: 'Open', USED_UP: 'Used up', EXPIRED: 'Expired', BLOCKED: 'Blocked' };
const STATE_COLOUR = { OPEN: 'var(--accent-success)', USED_UP: 'var(--text-secondary)', EXPIRED: 'var(--accent-warning)', BLOCKED: 'var(--accent-danger)' };
const KIND = { SOLD: 'Sold', USED: 'Used on a bill', REFUNDED: 'Returned onto the voucher', EXTENDED: 'Extended', BLOCKED: 'Blocked', UNBLOCKED: 'Unblocked' };
const METHOD = { CASH: 'cash', UPI: 'UPI', CARD: 'card' };
const box = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '16px' };

export default function GiftVouchers() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);
  const q = useGiftVouchers({ search: search || undefined, status: status || undefined });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px' }}>
      <button type="button" onClick={() => navigate('/customers')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <ArrowLeft size={14} /> Customers
      </button>
      <h1 style={{ fontSize: '28px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}><Gift size={24} /> Gift vouchers</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Sold and used at the POS till. Rules are in <Link to="/settings?section=GIFT_VOUCHERS">Settings → Gift vouchers</Link>.
      </p>

      {q.isError ? <LoadFailed onRetry={q.refetch} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <Metric label="Still owed to customers" value={q.data ? rupees(q.data.summary.owedPaise) : '…'} sub={q.data ? `${q.data.summary.openVouchers} open vouchers` : ''} />
            <Metric label="Sold this month" value={q.data ? rupees(q.data.summary.soldThisMonthPaise) : '…'} sub={q.data ? `${q.data.summary.soldThisMonth} vouchers` : ''} />
            <Metric label="Expiring in 30 days" value={q.data ? String(q.data.summary.expiringIn30Days) : '…'} sub="still have money on them" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setSearch(typed.trim()); }} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <label htmlFor="gv-search" className="sr-only">Code, phone or name</label>
            <input id="gv-search" className="input-field" style={{ flex: '1 1 220px' }} placeholder="Code, phone or name" value={typed} onChange={e => setTyped(e.target.value)} />
            <button type="submit" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Search size={14} /> Find</button>
            <label htmlFor="gv-status" className="sr-only">Show</label>
            <select id="gv-status" className="input-field" style={{ flex: '0 0 160px' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All vouchers</option>
              {Object.entries(STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </form>

          {q.isLoading ? <p style={{ color: 'var(--text-secondary)' }}><Loader2 size={14} className="animate-spin" /> Loading…</p>
            : q.data.vouchers.length === 0 ? (
              <div style={{ ...box, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {search || status ? 'No voucher matches that.' : 'No gift vouchers sold yet. They are sold at the POS till once switched on in Settings.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {q.data.vouchers.length === 200 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Showing the newest 200. Search to find an older one.</p>}
                {q.data.vouchers.map(v => (
                  <div key={v.id} style={box}>
                    <button type="button" aria-expanded={openId === v.id} onClick={() => setOpenId(openId === v.id ? null : v.id)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                      {openId === v.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: '130px' }}>{v.code}</span>
                      <span style={{ flex: '1 1 140px', color: 'var(--text-secondary)', fontSize: '14px' }}>{v.buyerName || 'No name'}{v.buyerPhone ? ` · ${v.buyerPhone}` : ''}</span>
                      <span style={{ fontWeight: 600 }}>{rupees(v.balancePaise)} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '13px' }}>of {rupees(v.initialPaise)}</span></span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '120px' }}>Until {day(v.expiresAt)}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: STATE_COLOUR[v.state] }}>{STATES[v.state]}</span>
                    </button>
                    {openId === v.id && <VoucherDetail id={v.id} />}
                  </div>
                ))}
              </div>
            )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div style={box}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>
    </div>
  );
}

function VoucherDetail({ id }) {
  const { can } = usePermission();
  const d = useGiftVoucher(id);
  const extend = useExtendGiftVoucher();
  const block = useBlockGiftVoucher();
  const unblock = useUnblockGiftVoucher();
  const [months, setMonths] = useState('3');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState(null);
  if (d.isError) return <div style={{ marginTop: '12px' }}><LoadFailed onRetry={d.refetch} /></div>;
  if (d.isLoading) return <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)' }}>Loading…</p>;
  const v = d.data;
  const expired = new Date(v.expiresAt).getTime() < Date.now();
  const busy = extend.isPending || block.isPending || unblock.isPending;
  const run = async (m, body, done) => {
    setProblem(null);
    try { await m.mutateAsync({ id, ...body }); toast.success(done); setReason(''); }
    catch (e) { setProblem(e?.message || 'That did not work. Try again.'); }
  };

  return (
    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', display: 'grid', gap: '14px' }}>
      <ol style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '6px', fontSize: '14px' }}>
        {v.entries.map(e => (
          <li key={e.id}>
            <strong>{KIND[e.kind] || e.kind}</strong>
            {e.amountPaise ? ` ${e.kind === 'USED' ? '−' : '+'}${rupees(Math.abs(e.amountPaise))}` : ''}
            {e.kind === 'SOLD' && Array.isArray(e.payments) && e.payments.length ? ` (paid by ${e.payments.map(p => METHOD[p.method] || p.method).join(' + ')})` : ''}
            <span style={{ color: 'var(--text-secondary)' }}>
              {' · '}{day(e.at)}{e.store ? ` · ${e.store}` : ''}
              {e.order ? <> · bill <Link to={`/orders/${e.order.id}`}>{e.invoiceNo || e.order.number}</Link></> : ''}
              {' · left '}{rupees(e.balancePaise)}
            </span>
            {e.note && e.kind !== 'SOLD' && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.note}</div>}
          </li>
        ))}
      </ol>
      {v.buyerCustomerId && <div style={{ fontSize: '13px' }}><Link to={`/customers/${v.buyerCustomerId}`}>Open the buyer's customer record</Link></div>}

      {can('voucher:manage') && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {!expired && v.status === 'ACTIVE' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div>
                <label htmlFor={`gv-m-${id}`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Extend by (months)</label>
                <select id={`gv-m-${id}`} className="input-field" value={months} onChange={e => setMonths(e.target.value)}>
                  {[1, 3, 6, 12].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(extend, { months: Number(months) }, 'Voucher extended')}>Extend</button>
            </div>
          )}
          {v.status === 'ACTIVE' ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flex: '1 1 260px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor={`gv-r-${id}`} style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Why block it?</label>
                <input id={`gv-r-${id}`} className="input-field" placeholder="For example: customer lost it" value={reason} onChange={e => { setReason(e.target.value); setProblem(null); }} />
              </div>
              <button type="button" className="btn-secondary" style={{ color: 'var(--accent-danger)' }} disabled={busy}
                onClick={() => reason.trim() ? run(block, { reason: reason.trim() }, 'Voucher blocked') : setProblem('Write why you are blocking it first.')}>Block</button>
            </div>
          ) : (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run(unblock, {}, 'Voucher unblocked')}>Unblock</button>
          )}
          {expired && v.status === 'ACTIVE' && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Expired vouchers cannot be extended. The unused money stays with the shop.</p>}
        </div>
      )}
      {problem && <p role="alert" style={{ margin: 0, color: 'var(--accent-danger)', fontSize: '13px' }}>{problem}</p>}
    </div>
  );
}
