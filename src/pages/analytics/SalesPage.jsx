import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { qtyShown } from '../../lib/units';
import { AN_CSS, PageHead, StorePick, Seg, Stat, Bar, Loading, Problem, Money, useAnalytics, useFilters, useIsPhone, rupees, shortRupees, share } from './shared';

/**
 * Sales: the dashboard's sales cards, opened up. A period (7 days, the card's 30 days, this month, 12 months, or a
 * custom range) and a store (the one chosen at the top of the app, as the cards show, or all of them); the totals
 * against the same length of time before; every day (or month) split in store and online; each store; the top
 * products; payment methods; and sales by category.
 */
const PERIODS = [{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'month', label: 'This month' }, { value: 'year', label: '12 months' }, { value: 'custom', label: 'Custom range' }];
const PAY = { UPI: 'UPI', CARD: 'Card', CASH: 'Cash', ONLINE: 'Online payment', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', POINTS: 'Loyalty points', CREDIT: 'Store credit', VOUCHER: 'Gift voucher' };
const day = (k, opts) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', opts);
const axisLabel = (k, by) => (by === 'month' ? new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : day(k, { day: 'numeric', month: 'short' }));

function Chart({ series, by }) {
  const box = useRef(null);
  const [w, setW] = useState(700);
  const [tip, setTip] = useState(null);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = w < 480 ? 180 : 230, L = 46, R = 4, T = 8, B = 24, cw = Math.max(1, w - L - R), ch = H - T - B;
  const most = Math.max(1, ...series.map(s => s.till + s.online));
  const top = (() => { const p = Math.pow(10, Math.floor(Math.log10(most))); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= most) return k * p; return 10 * p; })();
  const y = (v) => T + ch - (v / top) * ch;
  const slot = cw / Math.max(1, series.length), bw = Math.max(2, Math.min(34, slot * 0.64));
  const every = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(cw / 70))));
  if (series.every(s => s.till + s.online === 0)) return <p className="an-empty">No sales recorded in this period.</p>;
  return (
    <div ref={box} style={{ position: 'relative' }} onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`${by === 'month' ? 'Monthly' : 'Daily'} sales, in store and online`}>
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i}>
            <line x1={L} x2={w - R} y1={y((top / 4) * i)} y2={y((top / 4) * i)} stroke="var(--border-light)" />
            <text x={L - 8} y={y((top / 4) * i) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{shortRupees((top / 4) * i).replace(' ', '')}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const cx = L + slot * i + slot / 2, ht = (s.till / top) * ch, ho = (s.online / top) * ch;
          const show = () => setTip({ x: Math.min(Math.max(cx - 90, 0), w - 180), s });
          return (
            <g key={s.key}>
              {ht > 0 && <rect x={cx - bw / 2} y={T + ch - ht} width={bw} height={ht} fill="var(--ov-till)" rx={Math.min(3, bw / 3)} />}
              {ho > 0 && <rect x={cx - bw / 2} y={T + ch - ht - ho} width={bw} height={ho} fill="var(--ov-online)" rx={Math.min(3, bw / 3)} />}
              {(i % every === 0 || i === series.length - 1) && <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{axisLabel(s.key, by)}</text>}
              {s.till + s.online > 0 && <rect x={L + slot * i} y={T} width={slot} height={ch} fill="transparent" onMouseEnter={show} onClick={show} />}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="ov-tip" style={{ left: tip.x, top: 0 }} role="status">
          <b style={{ display: 'block', marginBottom: 6 }}>{by === 'month' ? new Date(`${tip.s.key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : day(tip.s.key, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
          <div><span>In store</span><b>{rupees(tip.s.till)}</b></div>
          <div><span>Online</span><b>{rupees(tip.s.online)}</b></div>
          <div><span>{tip.s.bills} invoice{tip.s.bills === 1 ? '' : 's'}</span><b>{rupees(tip.s.till + tip.s.online)}</b></div>
        </div>
      )}
    </div>
  );
}

/** A labelled list of amounts with a share bar under each: stores, payment methods, categories. */
function Shares({ rows, total, tone, empty }) {
  if (!rows.length) return <p className="an-empty">{empty}</p>;
  return (
    <div className="an-list">
      {rows.map(r => (
        <div key={r.key} className="an-li">
          <span style={{ minWidth: 0 }}>{r.name}{r.meta && <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}> · {r.meta}</span>}</span>
          <b style={{ fontVariantNumeric: 'tabular-nums' }}>{rupees(r.value)}</b>
          <span style={{ gridColumn: '1 / -1' }}><Bar value={share(r.value, total)} tone={tone} label={`${Math.round(share(r.value, total))}%`} /></span>
        </div>
      ))}
    </div>
  );
}

export default function SalesPage() {
  const phone = useIsPhone();
  const { locations, currentLocation, isLoading: storesLoading } = useLocationContext();
  // Opens on the store the dashboard was showing, so the first figures are the card's.
  const [get, set] = useFilters({ period: '30d', store: currentLocation?.id ?? 'all' });
  const period = get('period'), store = get('store');
  const [from, setFrom] = useState(get('from')), [to, setTo] = useState(get('to'));
  const [dateProblem, setDateProblem] = useState('');
  const custom = period === 'custom';
  const ready = !custom || (get('from') && get('to'));
  const { data, error, isLoading, isFetching, refetch } = useAnalytics('sales', { period, ...(custom ? { from: get('from'), to: get('to') } : {}), ...(store !== 'all' ? { locationId: store } : {}) }, { enabled: !!ready && !storesLoading });
  const applyDates = () => {
    if (!from || !to) return setDateProblem('Select a start date and an end date.');
    if (from > to) return setDateProblem('The start date must be on or before the end date.');
    setDateProblem(''); set({ from, to });
  };
  const t = data?.totals;
  const today = new Date().toISOString().slice(0, 10);
  // Only once there is a period to describe: a custom range without its dates has none yet.
  const range = data && ready ? `${data.store ? data.store.name : 'All stores'} · ${day(data.period.from, { day: 'numeric', month: 'short', year: 'numeric' })} to ${day(data.period.to, { day: 'numeric', month: 'short', year: 'numeric' })}` : null;

  return (
    <div className="an">
      <style>{AN_CSS}</style>
      <PageHead title="Sales" subtitle={range}>
        <Seg label="Period" options={PERIODS} value={period} onChange={(v) => set({ period: v, ...(v !== 'custom' ? { from: '', to: '' } : {}) })} />
        <StorePick stores={locations} value={store} onChange={(v) => set({ store: v })} />
      </PageHead>

      {custom && (
        <div className="ov-card an-dates">
          <label htmlFor="an-from">From</label>
          <input id="an-from" type="date" className="input-field" value={from} max={today} onChange={(e) => { setFrom(e.target.value); setDateProblem(''); }} />
          <label htmlFor="an-to">To</label>
          <input id="an-to" type="date" className="input-field" value={to} max={today} onChange={(e) => { setTo(e.target.value); setDateProblem(''); }} />
          <button type="button" className="btn-secondary" onClick={applyDates}>Apply</button>
          {dateProblem ? <span className="an-err" role="alert" style={{ gridColumn: '1 / -1' }}>{dateProblem}</span>
            : !ready && <span className="an-note" style={{ gridColumn: '1 / -1' }}>Select a date range of up to one year.</span>}
        </div>
      )}

      {error ? <Problem error={error} onRetry={refetch} />
        : !ready ? null
          : isLoading || !data ? <Loading />
            : (
              <div className="an" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .15s' }}>
                <div className="an-grid4">
                  <Stat label="Total sales" value={<Money value={t.sales} compact={phone} />}
                    note={t.change != null
                      ? <span className={t.change >= 0 ? 'an-up' : 'an-down'}>{t.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {t.change >= 0 ? '+' : ''}{Math.abs(t.change) >= 100 ? Math.round(t.change).toLocaleString('en-IN') : t.change}% vs previous period</span>
                      : 'No sales in the previous period'} />
                  <Stat label="Invoices" value={t.bills.toLocaleString('en-IN')} note={`${t.tillBills} in store · ${t.onlineBills} online`} />
                  <Stat label="Average invoice" value={t.average != null ? rupees(t.average) : '—'} note={t.previousBills ? `${rupees(t.previous / t.previousBills)} previous period` : 'No previous period to compare'} />
                  <Stat label="Returns" value={<Money value={t.returns} compact={phone} />} note={t.returnCount ? `${t.returnCount} return${t.returnCount === 1 ? '' : 's'} · ${t.returnShare}% of sales` : 'No returns'} />
                </div>

                <section className="ov-card">
                  <div className="an-card-h">
                    <h2>{data.period.by === 'month' ? 'Monthly sales' : 'Daily sales'}</h2>
                    <div className="an-legend"><span><i style={{ background: 'var(--ov-till)' }} />In store {rupees(t.till)}</span><span><i style={{ background: 'var(--ov-online)' }} />Online {rupees(t.online)}</span></div>
                  </div>
                  <Chart series={data.series} by={data.period.by} />
                </section>

                <div className="an-grid2">
                  <section className="ov-card">
                    <div className="an-card-h"><h2>Sales by store</h2></div>
                    <Shares rows={data.stores.map(s => ({ key: s.id, name: s.name, meta: `${s.bills} invoice${s.bills === 1 ? '' : 's'}`, value: s.sales }))} total={t.sales} empty="No sales recorded in this period." />
                  </section>
                  <section className="ov-card">
                    <div className="an-card-h"><h2>Top products</h2></div>
                    {data.bestSellers.length === 0 ? <p className="an-empty">No sales recorded in this period.</p> : (
                      <div className="an-rows">
                        {data.bestSellers.map((b, i) => (
                          <div key={b.productId} className="an-row" style={{ gap: 2 }}>
                            <div className="an-row-top">
                              <Link to={`/products/${b.productId}`} className="an-row-name" style={{ fontWeight: 600 }}>{i + 1}. {b.title}</Link>
                              <span className="an-row-fig">{rupees(b.sales)}</span>
                            </div>
                            <div className="an-row-meta"><span>{qtyShown(b.quantity, b.soldBy)}{b.soldBy === 'PIECE' ? (b.quantity === 1 ? ' piece' : ' pieces') : ''} sold</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="an-grid2">
                  <section className="ov-card">
                    <div className="an-card-h"><h2>Payment methods</h2></div>
                    <Shares rows={data.payments.map(p => ({ key: p.method, name: PAY[p.method] ?? p.method, value: p.amount }))} total={data.payments.reduce((x, q) => x + q.amount, 0)} tone="online" empty="No payments recorded in this period." />
                  </section>
                  <section className="ov-card">
                    <div className="an-card-h"><h2>Sales by category</h2></div>
                    <Shares rows={data.categories.map(c => ({ key: c.name, name: c.name, value: c.sales }))} total={data.categories.reduce((x, q) => x + q.sales, 0)} empty="No sales recorded in this period." />
                  </section>
                </div>
                <p className="an-note">Sales include confirmed invoices and online orders before returns. Cancelled and draft orders are excluded. Dates follow Indian Standard Time.</p>
              </div>
            )}
    </div>
  );
}
