import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { IndianRupee, Package, TriangleAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../contexts/LocationContext';

/**
 * The Dashboard's top half: a welcome line, three live cards (sales, stock, running low), sales by
 * month or by day split till / online, the top sellers with their photos, and the latest orders.
 *
 * Every part comes from GET /dashboard/overview, which leaves out (null) whatever this person may not
 * see -- so a part is drawn only when the server sent it, and nothing here re-checks permissions.
 * Numbers count up, bars grow and the sales line draws itself, unless the device asks for less motion.
 */

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
/** Short money for an axis: ₹1.5L, ₹50k, ₹800. */
const short = (n) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')}L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}k` : `₹${Math.round(n)}`);
const isOnline = (channel) => channel === 'ONLINE' || channel === 'MARKETPLACE';
const rise = (i) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] } });

/** A number that counts up to its value once, on arrival. */
function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-IN') }) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? value : 0);
  useEffect(() => {
    if (still) { setShown(value); return undefined; }
    let raf; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1100); setShown(value * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, still]);
  return <>{format(shown)}</>;
}

/** The last 30 days as a line, smoothed over five days so one big sale does not flatten the rest. */
function Sparkline({ daily }) {
  const still = useReducedMotion();
  const path = useRef(null);
  const { line, area, end } = useMemo(() => {
    const vals = daily.map((_, i) => { const w = daily.slice(Math.max(0, i - 4), i + 1); return w.reduce((t, d) => t + d.till + d.online, 0) / w.length; });
    const max = Math.max(...vals) || 1;
    const pts = vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * 120, 36 - (v / max) * 32]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return { line: d, area: `${d} L120 38 L0 38 Z`, end: pts[pts.length - 1] };
  }, [daily]);
  useLayoutEffect(() => {
    const el = path.current; if (!el || still) return;
    const L = el.getTotalLength(); el.style.transition = 'none'; el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1.2s ease .3s'; el.style.strokeDashoffset = 0;
  }, [line, still]);
  return (
    <svg viewBox="0 0 120 38" preserveAspectRatio="none" style={{ width: 120, height: 38, overflow: 'visible', flex: 'none' }} aria-hidden="true">
      <defs><linearGradient id="ov-spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A6D92B" stopOpacity=".35" /><stop offset="1" stopColor="#A6D92B" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#ov-spark)" />
      <path ref={path} d={line} fill="none" stroke="var(--ov-online)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {end && <circle cx={end[0]} cy={end[1]} r="3.2" fill="var(--ov-online)" stroke="var(--bg-card)" strokeWidth="2" />}
    </svg>
  );
}

/** Stacked bars, till under online, drawn to one scale; hover or tap a bar for its figures. */
function SalesChart({ sales }) {
  const still = useReducedMotion();
  const [period, setPeriod] = useState('month');
  const [tip, setTip] = useState(null);
  const box = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 290 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // Months from the first with any sale (a young shop should not open on six empty months).
  const rows = useMemo(() => {
    if (period === 'day') return sales.daily.map(d => ({ key: d.day, label: new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), till: d.till, online: d.online }));
    const first = sales.monthly.findIndex(m => m.till + m.online > 0);
    return sales.monthly.slice(first < 0 ? sales.monthly.length - 1 : first).map(m => ({
      key: m.month, label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' }),
      long: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), till: m.till, online: m.online, orders: m.orders
    }));
  }, [sales, period]);
  // Grow from the floor whenever the period changes (and on arrival).
  const [grown, setGrown] = useState(still);
  useEffect(() => { if (still) return undefined; setGrown(false); const t = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true))); return () => cancelAnimationFrame(t); }, [period, still]);

  const { w: W, h: H } = size;
  const L = 48, R = 6, T = 10, B = 26, cw = Math.max(1, W - L - R), ch = Math.max(1, H - T - B);
  const most = Math.max(1, ...rows.map(r => r.till + r.online));
  const top = (() => { const p = Math.pow(10, Math.floor(Math.log10(most))); for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= most) return s * p; return 10 * p; })();
  const y = (v) => T + ch - (v / top) * ch;
  const slot = cw / Math.max(1, rows.length), bw = Math.min(period === 'month' ? 46 : 14, slot * 0.62);
  const nothing = rows.every(r => r.till + r.online === 0);

  return (
    <div className="ov-card">
      <div className="ov-head">
        <h2>{period === 'month' ? 'Sales by month' : 'Sales by day · last 30 days'}</h2>
        <div className="ov-legend"><span><i style={{ background: 'var(--ov-till)' }} />At the till</span><span><i style={{ background: 'var(--ov-online)' }} />Online</span></div>
        <span className="sp" />
        <div className="ov-seg" role="group" aria-label="Show sales by">
          <button type="button" aria-pressed={period === 'month'} onClick={() => { setTip(null); setPeriod('month'); }}>Monthly</button>
          <button type="button" aria-pressed={period === 'day'} onClick={() => { setTip(null); setPeriod('day'); }}>Last 30 days</button>
        </div>
      </div>
      <div className="ov-chart" ref={box} onMouseLeave={() => setTip(null)}>
        {nothing ? (
          <p className="ov-muted" style={{ margin: 0, paddingTop: 100, textAlign: 'center' }}>No sales here yet. Bills from the till and orders from the online shop will show up here.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${period === 'month' ? 'Sales by month' : 'Sales by day'}, at the till and online`}>
            <g className="ov-grid">{[0, 1, 2, 3, 4].map(i => <line key={i} x1={L} x2={W - R} y1={y((top / 4) * i)} y2={y((top / 4) * i)} />)}</g>
            {[0, 1, 2, 3, 4].map(i => <text key={i} x={L - 8} y={y((top / 4) * i) + 4} textAnchor="end">{short((top / 4) * i)}</text>)}
            {rows.map((r, i) => {
              const cx = L + slot * i + slot / 2, hp = (r.till / top) * ch, ho = (r.online / top) * ch, rad = Math.min(6, bw / 2.5);
              const label = period === 'month' || i % 5 === 0 || i === rows.length - 1;
              const grow = (j) => ({ transform: grown ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${i * (period === 'month' ? 0.07 : 0.02) + j * 0.12}s` });
              const show = () => setTip({ x: Math.min(Math.max(cx - 90, 0), W - 180), y: Math.max(0, y(r.till + r.online) - 100), r });
              return (
                <g key={r.key} className="ov-col">
                  {hp > 0 && <rect className="ov-bar" style={grow(0)} x={cx - bw / 2} y={T + ch - hp} width={bw} height={hp} rx={Math.min(rad, hp / 2)} fill="var(--ov-till)" />}
                  {ho > 0 && <rect className="ov-bar" style={grow(1)} x={cx - bw / 2} y={T + ch - hp - ho} width={bw} height={ho} rx={Math.min(rad, ho / 2)} fill="var(--ov-online)" />}
                  {label && <text x={cx} y={H - 6} textAnchor="middle">{r.label}</text>}
                  {r.till + r.online > 0 && <rect x={L + slot * i} y={T} width={slot} height={ch} fill="transparent" onMouseEnter={show} onClick={show} />}
                </g>
              );
            })}
          </svg>
        )}
        {tip && (
          <div className="ov-tip" style={{ left: tip.x, top: tip.y }} role="status">
            <b style={{ display: 'block', marginBottom: 6 }}>{tip.r.long ?? tip.r.label}</b>
            <div><span>At the till</span><b>{rupees(tip.r.till)}</b></div>
            <div><span>Online</span><b>{rupees(tip.r.online)}</b></div>
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid color-mix(in srgb, var(--bg-card) 25%, transparent)' }}>
              <span>Total{tip.r.orders != null ? ` · ${tip.r.orders} order${tip.r.orders === 1 ? '' : 's'}` : ''}</span><b>{rupees(tip.r.till + tip.r.online)}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const timeAgo = (at) => {
  const m = Math.round((Date.now() - new Date(at).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function Overview({ actions, summary }) {
  const { user } = useAuth();
  const { currentLocation, isLoading: storesLoading } = useLocationContext();
  const { data, isLoading: figuresLoading } = useQuery({
    queryKey: ['dashboard-overview', currentLocation?.id ?? 'all'],
    queryFn: async () => (await api.get('/dashboard/overview')).data,
    // Asked once the store is known: asking before fetched the whole shop's figures, then the store's,
    // and the cards flashed back to placeholders in between.
    enabled: !storesLoading,
    // Switching store keeps the last figures on screen until the new ones arrive, instead of blanking.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000
  });
  const isLoading = storesLoading || figuresLoading;
  const first = String(user?.name || '').trim().split(/\s+/)[0];
  const name = first ? first[0].toUpperCase() + first.slice(1) : '';
  const now = new Date();
  const when = `${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · ${now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
  const d = data;
  const place = currentLocation?.name ?? 'your shop';

  // What today looks like, in one sentence, using only what this person may see.
  const sentence = (() => {
    if (!d) return null;
    const bits = [];
    const o = d.today.orders;
    bits.push(<span key="o"><b>{o === 0 ? 'no orders yet' : `${o} order${o === 1 ? '' : 's'}`}</b>{d.today.total != null && o > 0 ? <> worth <b>{rupees(d.today.total)}</b></> : null}</span>);
    if (d.stock && d.stock.low > 0) bits.push(<span key="l"><b>{d.stock.low} colour{d.stock.low === 1 ? '' : 's'}</b> running low</span>);
    return <>Here's what's moving at {place} today: {bits.reduce((acc, b, i) => (i ? [...acc, ', and ', b] : [b]), [])}.</>;
  })();

  const cards = d ? [d.sales && 'sales', d.stock && 'stock', d.stock && 'low'].filter(Boolean) : [];
  const change = d?.sales && d.sales.prev30 > 0 ? ((d.sales.last30 - d.sales.prev30) / d.sales.prev30) * 100 : null;
  const plenty = d?.stock ? Math.max(0, d.stock.colours - d.stock.low - d.stock.out) : 0;

  return (
    <div className="ov">
      {/* As many columns as cards this person gets; with none, the welcome band takes the row. */}
      <section className="ov-row1" style={isLoading ? { '--ov-n': 3 } : cards.length ? { '--ov-n': cards.length } : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <motion.div className="ov-hello" {...rise(0)}>
          <span className="ov-chip"><span className="ov-live" aria-hidden="true" />{when}</span>
          <h1>Welcome back{name ? `, ${name}` : ''}!</h1>
          {isLoading ? <span className="ov-skel" style={{ height: 18, width: 'min(420px, 90%)' }} aria-label="Loading today's figures" /> : <p>{sentence}</p>}
          {actions && <div className="ov-acts">{actions}</div>}
        </motion.div>

        {/* While the figures arrive: the shapes of the cards, so the page fills in rather than waits. */}
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="ov-card ov-kpi" aria-hidden="true">
            <span className="ov-skel" style={{ height: 12, width: '55%' }} />
            <span className="ov-skel" style={{ height: 28, width: '70%', marginTop: 8 }} />
            <span className="ov-skel" style={{ height: 10, width: '85%', marginTop: 'auto' }} />
          </div>
        ))}

        {d?.sales && (
          <motion.div className="ov-card ov-kpi" {...rise(1)}>
            <div className="ov-kpi-head"><span>Sales · last 30 days</span><span className="ov-ico"><IndianRupee size={17} /></span></div>
            <div className="ov-big"><CountUp value={d.sales.last30} format={rupees} /></div>
            <div className="ov-foot">
              {change != null
                ? <span className={`ov-delta ${change >= 0 ? 'up' : 'down'}`}>{change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                : <span className="ov-muted">First month of sales</span>}
              <Sparkline daily={d.sales.daily} />
            </div>
            <div className="ov-muted">{d.sales.prev30 > 0 ? `vs ${rupees(d.sales.prev30)} the 30 days before · ` : ''}{d.sales.orders30} order{d.sales.orders30 === 1 ? '' : 's'}</div>
          </motion.div>
        )}

        {d?.stock && (
          <motion.div className="ov-card ov-kpi" {...rise(2)}>
            <div className="ov-kpi-head"><span>Stock on hand{currentLocation ? ` · ${currentLocation.name}` : ''}</span><span className="ov-ico"><Package size={17} /></span></div>
            <div className="ov-big"><CountUp value={d.stock.units} /> <small>pieces</small></div>
            {d.stock.value != null && <div className="ov-muted">{rupees(d.stock.value)} at cost{summary?.companyWideValue != null ? ` · ${rupees(summary.companyWideValue)} across all stores` : ''}</div>}
            {/* How far to trust that value (it moved here from the old Inventory value tile). */}
            {d.stock.value != null && (summary?.unitsWithoutCost > 0 || summary?.unitsValuedAtPrice > 0) && (
              <div className="ov-muted" style={{ fontSize: 11.5 }}>
                {summary.unitsWithoutCost > 0
                  ? `${summary.unitsWithoutCost.toLocaleString('en-IN')} pieces have no cost or price and count as ₹0. Add a unit cost when you stock in.`
                  : `${summary.unitsValuedAtPrice.toLocaleString('en-IN')} pieces are valued at their selling price (no cost recorded). Add a unit cost when you stock in.`}
              </div>
            )}
            <div style={{ marginTop: 'auto', display: 'grid', gap: 7 }}>
              <div className="ov-split" aria-hidden="true">
                {[[plenty, 'var(--ov-till)'], [d.stock.low, 'var(--accent-warning)'], [d.stock.out, 'var(--accent-danger)']].map(([v, c], i) => (
                  <span key={i} style={{ display: 'block', height: '100%', width: `${(v / Math.max(1, d.stock.colours)) * 100}%`, background: c }} />
                ))}
              </div>
              <div className="ov-legend">
                <span><i style={{ background: 'var(--ov-till)' }} />Plenty {plenty}</span>
                <span><i style={{ background: 'var(--accent-warning)' }} />Low {d.stock.low}</span>
                <span><i style={{ background: 'var(--accent-danger)' }} />Sold out {d.stock.out}</span>
                <span>colours</span>
              </div>
            </div>
          </motion.div>
        )}

        {d?.stock && (
          <motion.div className="ov-card ov-kpi" {...rise(3)}>
            <div className="ov-kpi-head"><span>Running low</span><span className="ov-ico warn"><TriangleAlert size={17} /></span></div>
            <div className="ov-big"><CountUp value={d.stock.low} /> <small>colour{d.stock.low === 1 ? '' : 's'}</small></div>
            <div className="ov-muted">{d.stock.low > 0 ? `${d.stock.lowPieces} pieces left between them · at or under their reorder level` : 'Nothing at or under its reorder level.'}</div>
            {d.stock.lowest.length > 0 && (
              <div className="ov-lows">
                {d.stock.lowest.map((l, i) => (
                  <Link key={i} to={`/products/${l.productId}`}><span>{l.title}{l.colour ? ` · ${l.colour}` : ''}{l.size && !/free/i.test(l.size) ? ` · ${l.size}` : ''}</span><b>{l.left} left</b></Link>
                ))}
                {d.stock.low > d.stock.lowest.length && <Link to="/inventory/alerts" style={{ fontWeight: 600 }}><span>See all {d.stock.low}</span></Link>}
              </div>
            )}
          </motion.div>
        )}
      </section>

      {isLoading && <div className="ov-card" aria-hidden="true"><span className="ov-skel" style={{ height: 14, width: 160 }} /><span className="ov-skel" style={{ height: 240, width: '100%', marginTop: 14, borderRadius: 12 }} /></div>}
      {d?.sales && <motion.div {...rise(4)}><SalesChart sales={d.sales} /></motion.div>}

      {(d?.topSellers?.length > 0 || d?.latestOrders) && (
        <section className={`ov-row3${d.topSellers?.length > 0 && d.latestOrders ? '' : ' one'}`}>
          {d.topSellers?.length > 0 && (
            <motion.div className="ov-card" {...rise(5)}>
              <div className="ov-head"><h2>Top sellers · last 30 days</h2><span className="sp" /><span className="ov-muted">{d.topSellers[0].revenue != null ? 'by sales value' : 'by pieces sold'}</span></div>
              <div className="ov-sellers">
                {d.topSellers.map((t, i) => (
                  <Link key={t.productId} to={`/products/${t.productId}`} className="ov-seller">
                    <span className="ov-ph">
                      {t.photo ? <img src={t.photo} alt="" loading="lazy" /> : <span className="ini">{t.title.trim()[0]?.toUpperCase()}</span>}
                      <span className="ov-rank">{i + 1}</span>
                    </span>
                    <span className="nm">{t.title}</span>
                    <span className="ov-muted">{t.revenue != null ? `${rupees(t.revenue)} · ` : ''}{t.pieces} sold</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
          {d.latestOrders && (
            <motion.div className="ov-card" {...rise(6)}>
              <div className="ov-head"><h2>Latest orders</h2><span className="sp" /><Link to="/orders" className="ov-muted" style={{ textDecoration: 'none' }}>See all</Link></div>
              {d.latestOrders.length === 0 ? <p className="ov-muted" style={{ margin: 0 }}>No orders yet.</p> : d.latestOrders.map(o => (
                <Link key={o.id} to={`/orders/${o.id}`} className="ov-order">
                  <span className="who">{(o.who || 'Walk-in customer').replace(/\s*\(no details taken\)/i, '')}</span>
                  <span className="amt">{o.total != null ? rupees(o.total) : ''}</span>
                  <span className="meta">
                    <span>{o.orderNumber}</span>
                    <span className={`ov-pill ${isOnline(o.channel) ? 'online' : ''}`}>{isOnline(o.channel) ? 'Online' : 'Till'}</span>
                    <span className={`ov-pill ${o.status === 'DISPATCHED' ? 'ok' : ''}`}>{o.status === 'DISPATCHED' ? 'Sent' : o.status === 'CANCELLED' ? 'Cancelled' : 'To pack'}</span>
                  </span>
                  <span className="meta" style={{ justifyContent: 'flex-end' }}>{timeAgo(o.at)}</span>
                </Link>
              ))}
            </motion.div>
          )}
        </section>
      )}
    </div>
  );
}
