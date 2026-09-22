import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Undo2, Banknote, Smartphone, CreditCard, Wallet, Repeat, CheckCircle2, Loader2, AlertTriangle, Minus, Plus } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { useFindSales, useSaleForReturn, useReturnPreview, useCompleteCounterReturn } from '../../hooks/useCounterReturn';
import { RETURN_REASONS } from '../../components/sales/labels';
import { formatINRExact } from '../../utils/formatUtils';

/**
 * Take a return at the counter: find the bill, choose what came back, and give the money back --
 * or turn it into credit for an exchange. One press does it all; the server books, restocks, moves
 * loyalty points and records the money together.
 */

const METHODS = [
  { key: 'CASH', label: 'Cash', icon: Banknote },
  { key: 'UPI', label: 'UPI', icon: Smartphone },
  { key: 'CARD', label: 'Card', icon: CreditCard },
  { key: 'CREDIT', label: 'Store credit', icon: Wallet }
];

const IN_WORDS = { CASH: 'cash', UPI: 'UPI', CARD: 'card', CREDIT: 'store credit' };
const card = { background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16, display: 'grid', gap: 12 };
const dateOf = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const lineName = (l) => [l.title, l.colorName, l.size].filter(Boolean).join(', ');

function BillPicker({ onPick }) {
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  useEffect(() => { const t = setTimeout(() => setAsked(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const found = useFindSales(asked);
  return (
    <section style={card} aria-label="Find the bill">
      <label htmlFor="ret-q" style={{ fontWeight: 600 }}>Find the bill</label>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input id="ret-q" className="input-field" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Bill number, or the customer's phone or name" style={{ width: '100%', paddingLeft: 36 }} />
      </div>
      {found.isFetching && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><Loader2 size={14} className="animate-spin" /> Looking…</div>}
      {found.error && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-warning)' }}>{found.error.message}</div>}
      {found.data && found.data.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No bill matches that. Check the number on the receipt, or search by the customer's phone.</div>}
      {found.data?.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }} aria-label="Bills">
          {found.data.map(s => {
            const left = s.lines.reduce((a, l) => a + l.canReturn, 0);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => onPick(s.id)} disabled={left === 0}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: left ? 'pointer' : 'not-allowed', opacity: left ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{s.orderNumber}</strong>
                    <span>{formatINRExact(s.total)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {[s.customer?.name, s.customer?.phone, dateOf(s.createdAt), s.store].filter(Boolean).join(' · ')}
                    {left === 0 ? ' · everything already came back' : ` · ${left} piece${left === 1 ? '' : 's'} can come back`}
                    {s.window?.over ? ` · ${s.daysAgo} days old` : ''}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function CounterReturn() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const orderId = params.get('order');
  const { currentLocation } = useLocationContext();
  const sale = useSaleForReturn(orderId);
  const complete = useCompleteCounterReturn();

  const [qty, setQty] = useState({});          // dispatchItemId -> pieces coming back
  const [damaged, setDamaged] = useState({});  // dispatchItemId -> true when not going back on sale
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('REFUND');  // REFUND | EXCHANGE
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [done, setDone] = useState(null);
  // One key per return: pressing Complete twice, or again after a lost answer, is one return.
  const key = useRef(crypto.randomUUID());
  useEffect(() => { setQty({}); setDamaged({}); setReason(''); setNote(''); setMode('REFUND'); setMethod('CASH'); setReference(''); key.current = crypto.randomUUID(); }, [orderId]);

  const s = sale.data;
  const lines = useMemo(() => Object.entries(qty).filter(([, n]) => n > 0)
    .map(([dispatchItemId, quantity]) => ({ dispatchItemId, quantity, condition: damaged[dispatchItemId] ? 'DAMAGED' : 'RESTOCK' })), [qty, damaged]);
  const previewLines = useMemo(() => lines.map(({ dispatchItemId, quantity }) => ({ dispatchItemId, quantity })), [lines]);
  const preview = useReturnPreview(orderId, previewLines);
  const p = preview.data;
  const needsCustomer = (mode === 'EXCHANGE' || method === 'CREDIT') && !s?.customer?.id;
  const blocked = p?.needsManager && /^A manager/.test(p.needsManager);

  const problem = !currentLocation ? 'Choose your store in the top bar.'
    : lines.length === 0 ? 'Choose what is coming back.'
    : !reason ? 'Say why it is coming back.'
    : preview.isError ? preview.error?.message
    : !p ? 'Working it out…'
    : blocked ? p.needsManager
    : needsCustomer ? 'Store credit needs a customer on the bill. Give the money back another way.'
    : null;

  const submit = () => {
    if (problem || complete.isPending) return;
    complete.mutate({
      key: key.current, orderId, locationId: currentLocation.id, lines, reason, note: note.trim() || undefined,
      ...(mode === 'EXCHANGE' ? { exchange: true } : { refund: { method, reference: reference.trim() || undefined } })
    }, {
      // The hook hands back the server's answer itself: the finished return.
      onSuccess: (res) => { setDone(res); setQty({}); key.current = crypto.randomUUID(); },
      onError: (e) => toast.error(e?.message || 'The return could not be completed. Nothing was saved.')
    });
  };

  if (done) {
    return (
      <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px', textAlign: 'center', display: 'grid', gap: 14 }}>
        <CheckCircle2 size={56} style={{ color: 'var(--accent-success)', margin: '0 auto' }} />
        <h1 style={{ fontSize: 26, margin: 0 }}>Return {done.returnNumber} done</h1>
        <div style={{ color: 'var(--text-secondary)' }}>
          {done.pieces} piece{done.pieces === 1 ? '' : 's'} back from {done.orderNumber}
          {done.backOnSale < done.pieces ? ` (${done.pieces - done.backOnSale} damaged, not back on sale)` : ''}
        </div>
        {done.exchange ? (
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatINRExact(done.money)} is now {done.customer?.name?.split(' ')[0]}'s store credit</div>
        ) : done.refundWords ? (
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-success)' }}>Give back {done.refundWords}</div>
        ) : null}
        {done.pointsBack > 0 && <div style={{ fontSize: 14 }}>{done.pointsBack.toLocaleString('en-IN')} loyalty points went back to their points.</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {done.exchange && done.customer?.id && (
            <button className="btn-primary" autoFocus onClick={() => navigate(`/orders/new-sale?customer=${done.customer.id}&exchange=1`)}
              style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Repeat size={16} /> Choose the new pieces</button>
          )}
          <Link to={`/returns/${done.returnId}`} className={done.exchange ? 'btn-secondary' : 'btn-primary'} style={{ textDecoration: 'none' }}>Open the return</Link>
          <button className="btn-secondary" onClick={() => { setDone(null); setParams({}); }}>Another return</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16, paddingTop: 16, paddingBottom: 32, maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-icon" aria-label="Back to returns" onClick={() => navigate('/returns')}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>Take a return</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>A customer has brought something back{currentLocation ? ` to ${currentLocation.name}` : ''}.</div>
        </div>
      </div>

      {!orderId ? <BillPicker onPick={(id) => setParams({ order: id })} /> : sale.isLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
      ) : sale.error ? (
        <div role="alert" style={{ ...card, color: 'var(--accent-warning)' }}>{sale.error.message} <button className="btn-secondary" onClick={() => setParams({})}>Find another bill</button></div>
      ) : s && (
        <>
          <section style={card} aria-label="The bill">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{s.orderNumber}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {[s.customer?.name, s.customer?.phone, `${dateOf(s.createdAt)} (${s.daysAgo === 0 ? 'today' : `${s.daysAgo} day${s.daysAgo === 1 ? '' : 's'} ago`})`, s.store].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button className="btn-secondary" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => setParams({})}>A different bill</button>
            </div>
            {s.window?.over && (
              <div role="note" style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--accent-warning)' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} /> Bought {s.daysAgo} days ago. Your shop takes returns within {s.window.days} days.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {s.lines.map(l => {
                const n = qty[l.dispatchItemId] ?? 0;
                const set = (v) => setQty(prev => ({ ...prev, [l.dispatchItemId]: Math.max(0, Math.min(l.canReturn, v)) }));
                return (
                  <div key={l.dispatchItemId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: n ? 'var(--bg-hover)' : 'transparent', border: '1px solid var(--border-light)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{lineName(l)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {l.sku} · paid {formatINRExact(l.paidEach)} each · bought {l.sold}
                        {l.returned ? ` · ${l.returned} already back` : ''}{l.onOpenReturn ? ` · ${l.onOpenReturn} on an open return` : ''}
                      </div>
                      {n > 0 && (
                        <div role="radiogroup" aria-label={`Condition of ${lineName(l)}`} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          {[[false, 'Back on sale'], [true, 'Damaged']].map(([dmg, label]) => (
                            <button key={label} type="button" role="radio" aria-checked={!!damaged[l.dispatchItemId] === dmg}
                              className={!!damaged[l.dispatchItemId] === dmg ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 12, padding: '3px 10px' }}
                              onClick={() => setDamaged(prev => ({ ...prev, [l.dispatchItemId]: dmg }))}>{label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {l.canReturn === 0 ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All back</span> : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button type="button" className="btn-icon" aria-label={`One less ${lineName(l)}`} disabled={n === 0} onClick={() => set(n - 1)}><Minus size={14} /></button>
                        <span aria-live="polite" style={{ minWidth: 42, textAlign: 'center' }}>{n} / {l.canReturn}</span>
                        <button type="button" className="btn-icon" aria-label={`One more ${lineName(l)}`} disabled={n >= l.canReturn} onClick={() => set(n + 1)}><Plus size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              <select className="input-field" aria-label="Why is it coming back?" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Why is it coming back?</option>
                {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <input className="input-field" aria-label="Note" placeholder="Note (optional), e.g. zari loose near the pallu" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </section>

          <section style={card} aria-label="Money back">
            <div role="radiogroup" aria-label="Money back or exchange" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['REFUND', 'Give the money back', Undo2], ['EXCHANGE', 'Exchange for something else', Repeat]].map(([k, label, Icon]) => (
                <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)',
                    border: `1px solid ${mode === k ? 'var(--accent-primary)' : 'var(--border-light)'}`, background: mode === k ? 'var(--bg-hover)' : 'transparent', fontWeight: mode === k ? 600 : 400 }}>
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            {mode === 'REFUND' ? (
              <>
                <div role="radiogroup" aria-label="How the money goes back" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {METHODS.map(({ key: k, label, icon: Icon }) => (
                    <button key={k} type="button" role="radio" aria-checked={method === k} onClick={() => setMethod(k)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13,
                        border: `1px solid ${method === k ? 'var(--accent-primary)' : 'var(--border-light)'}`, background: method === k ? 'var(--bg-hover)' : 'transparent', fontWeight: method === k ? 600 : 400 }}>
                      <Icon size={17} /> {label}
                    </button>
                  ))}
                </div>
                {(method === 'UPI' || method === 'CARD') && (
                  <input className="input-field" aria-label="Reference" maxLength={40} value={reference} onChange={(e) => setReference(e.target.value)}
                    placeholder={method === 'UPI' ? 'UPI reference (optional)' : 'Last 4 digits or approval code (optional)'} />
                )}
                {method === 'CREDIT' && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Kept for {s.customer?.name?.split(' ')[0] ?? 'the customer'} to spend in the shop. It shows at New sale when their number is typed.</div>}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                What these pieces are worth becomes {s.customer?.name?.split(' ')[0] ?? 'the customer'}'s store credit, and New sale opens for them with it ready to use. They pay only the difference; if the new pieces cost less, the rest stays as credit.
              </div>
            )}

            {p && (
              <div style={{ display: 'grid', gap: 4, fontSize: 14, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{mode === 'EXCHANGE' ? 'Credit for the exchange' : 'Money back'}</span>
                  <strong style={{ fontSize: 22 }}>{formatINRExact(p.money)}</strong>
                </div>
                {p.pointsBack > 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Part of this bill was paid with loyalty points: {p.pointsBack.toLocaleString('en-IN')} points ({formatINRExact(p.pointsBackValue)}) go back as points, not money.</div>}
                {p.pointsTakenBack > 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.pointsTakenBack.toLocaleString('en-IN')} points earned on these pieces are taken back.</div>}
                {p.needsManager && <div role="alert" style={{ fontSize: 13, color: 'var(--accent-warning)', display: 'flex', gap: 6 }}><AlertTriangle size={15} style={{ flexShrink: 0 }} /> {p.needsManager}</div>}
              </div>
            )}
            <button type="button" className="btn-primary" onClick={submit} disabled={!!problem || complete.isPending}
              style={{ padding: '14px 16px', fontSize: 16, fontWeight: 700, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {complete.isPending ? <><Loader2 size={18} className="animate-spin" /> Taking it back…</>
                : mode === 'EXCHANGE' ? `Take back and exchange${p ? ` · ${formatINRExact(p.money)} credit` : ''}`
                : `Take back${p ? ` · give ${formatINRExact(p.money)} in ${IN_WORDS[method]}` : ''}`}
            </button>
            {problem && !complete.isPending && <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{problem}</div>}
          </section>
        </>
      )}
    </div>
  );
}
