import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useLocationContext } from '../../contexts/LocationContext';
import { useRecentTransactions } from '../../hooks/useRecentTransactions';
import { useDeadStock } from '../../hooks/useDeadStock';
import { useOverview } from './Overview';

/**
 * THE DASHBOARD'S LOWER HALF, in the same cards as the top (23 Oct, replacing six old tiles and two tabs).
 *
 *   Waiting on you     returns, transfers, new customers -- one line, only what this person may see,
 *                      and only the ones with something in them; "nothing waiting" when all are 0.
 *   Money tied up      what suppliers still owe in goods (ordered less received, this store's), and
 *                      stock not moved in 90 days. The old Open PO tile summed whole orders shop-wide.
 *   Stock moves        the latest stock in and out.
 *   To restock         sold out (published) first, then running low.
 *
 * Each part only when this person is allowed its figures: the server leaves money and stock out, and
 * a card with nothing to say is not drawn.
 */
const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const rise = (i) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 + i * 0.06, ease: [0.2, 0.8, 0.2, 1] } });
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Waiting() {
  const { currentLocation } = useLocationContext();
  // The same request (and cache) the old tiles used: /dashboard/my-day sends only what this person may see.
  const { data } = useQuery({
    queryKey: ['dashboard', 'my-day', currentLocation?.id ?? 'all'],
    queryFn: async () => (await api.get('/dashboard/my-day')).data ?? {},
    staleTime: 60 * 1000
  });
  if (!data) return null;
  const items = [
    data.returnsToInspect != null && { n: data.returnsToInspect, one: 'return to check', many: 'returns to check', to: '/returns', hot: true, none: 'returns to check' },
    data.returnsWaiting != null && { n: data.returnsWaiting, one: 'return not finished', many: 'returns not finished', to: '/returns', none: 'returns to finish' },
    data.transfersOnTheWay != null && { n: data.transfersOnTheWay, one: 'transfer on the way', many: 'transfers on the way', to: '/inventory/transfers', none: 'transfers on the way' },
    data.keptOverdue != null && { n: data.keptOverdue, one: 'kept order past its date', many: 'kept orders past their date', to: '/orders?kept=OVERDUE', hot: true, none: 'kept orders past their date' },
    data.customersToday != null && { n: data.customersToday, one: 'new customer today', many: 'new customers today', to: '/customers', none: 'new customers today' }
  ].filter(Boolean);
  if (!items.length) return null;
  const busy = items.filter(i => i.n > 0);
  return (
    <motion.div className="ov-card lh-card" {...rise(0)} aria-label="Waiting on you">
      <h3>Waiting on you</h3>
      {busy.length ? (
        <div className="lh-chips">
          {busy.map(i => (
            <Link key={i.one} to={i.to} className={`lh-chip${i.hot ? ' hot' : ''}`}><b>{i.n}</b> {i.n === 1 ? i.one : i.many}</Link>
          ))}
        </div>
      ) : (
        <p className="lh-calm"><span className="lh-tick"><Check size={13} /></span>Nothing waiting: no {items.map(i => i.none).join(', no ').replace(/, no ([^,]*)$/, ' or $1')}.</p>
      )}
    </motion.div>
  );
}

/** The pieces behind "not moved in 90 days", opened in place (the Inventory page has no such filter). */
function DeadList() {
  const { data, isLoading } = useDeadStock(90);
  const rows = Array.isArray(data) ? data : [];
  if (isLoading) return <span className="ov-skel" style={{ height: 80 }} />;
  return (
    <div className="lh-rows">
      {rows.map(r => (
        <Link key={r.id} to={`/products/${r.productId}`} className="lh-row">
          <div className="lh-what"><div>{r.productTitle}</div><div className="ov-muted">{r.sku} · {r.quantity} pieces · {r.daysSinceLastMovement} days still</div></div>
          <b>{rupees(r.inventoryValue)}</b>
        </Link>
      ))}
    </div>
  );
}

function TiedUp({ t, place }) {
  const [showDead, setShowDead] = React.useState(false);
  return (
    <motion.div className="ov-card lh-card" {...rise(1)} aria-label="Money tied up">
      <div className="lh-head"><h3>Money tied up · {place}</h3><span className="ov-muted">at cost</span></div>
      <div className="lh-two">
        <div className="lh-fig">
          <span className="ov-muted">Still to arrive from suppliers</span>
          <b>{rupees(t.toArrive)}</b>
          <span className="ov-muted">
            {t.toArriveOrders ? `${t.toArriveOrders} open order${t.toArriveOrders === 1 ? '' : 's'}` : 'Nothing on its way here'}
            {t.toArriveAll !== t.toArrive ? ` · ${rupees(t.toArriveAll)} across all stores` : ''}
          </span>
          <Link to="/inventory/purchase-orders?filter=open">See open orders</Link>
        </div>
        <div className="lh-fig">
          <span className="ov-muted">Not sold or moved in 90 days</span>
          <b>{rupees(t.dead)}</b>
          <span className="ov-muted">{t.deadPieces ? `${t.deadPieces.toLocaleString('en-IN')} pieces in ${t.deadColours} colour${t.deadColours === 1 ? '' : 's'}` : 'Nothing standing still'}</span>
          {t.deadPieces > 0 && (
            <button type="button" className="lh-link" aria-expanded={showDead} onClick={() => setShowDead(!showDead)}>
              {showDead ? 'Hide the list' : 'See the list'}
            </button>
          )}
        </div>
      </div>
      {showDead && <DeadList />}
    </motion.div>
  );
}

function Moves() {
  const { data, isLoading } = useRecentTransactions(8);
  const rows = Array.isArray(data) ? data : [];
  return (
    <motion.div className="ov-card lh-card" {...rise(2)} aria-label="Stock moves">
      <div className="lh-head"><h3>Stock moves</h3><Link to="/inventory/ledger">See all</Link></div>
      {isLoading ? <span className="ov-skel" style={{ height: 120 }} /> : rows.length === 0 ? (
        <p className="ov-muted">No stock has come in or gone out yet.</p>
      ) : (
        <div className="lh-rows">
          {rows.map(m => (
            <div key={m.id} className="lh-row">
              <div className="lh-what"><div>{m.product}</div><div className="ov-muted">{m.sku} · {when(m.date)}</div></div>
              <span className={`lh-qty ${m.quantity > 0 ? 'plus' : 'minus'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Restock({ stock, canOrder }) {
  const all = stock.toRestock ?? [];
  // As long as the stock moves beside it; the rest a press away.
  const [more, setMore] = React.useState(false);
  const list = more ? all : all.slice(0, 8);
  return (
    <motion.div className="ov-card lh-card" {...rise(3)} aria-label="To restock">
      <div className="lh-head">
        <h3>To restock · {stock.low} running low{stock.soldOutLive ? ` · ${stock.soldOutLive} sold out` : ''}</h3>
        {canOrder ? <Link to="/inventory/purchase-orders/new">Raise a purchase order</Link> : <Link to="/inventory/alerts">See all</Link>}
      </div>
      {list.length === 0 ? (
        <p className="lh-calm"><span className="lh-tick"><Check size={13} /></span>Nothing is running low.</p>
      ) : (
        <div className="lh-rows">
          {list.map((l, i) => (
            <Link key={`${l.productId}-${i}`} to={`/products/${l.productId}`} className="lh-row">
              <div className="lh-what"><div>{l.title}</div><div className="ov-muted">{[l.colour, l.size].filter(Boolean).join(' · ')}</div></div>
              {l.soldOut ? <span className="lh-out">Sold out</span> : (
                <span className="lh-level">
                  <span className="lh-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (l.left / Math.max(1, l.level)) * 100)}%` }} /></span>
                  <span><b>{l.left}</b> of {l.level}</span>
                </span>
              )}
            </Link>
          ))}
          {all.length > 8 && (
            <button type="button" className="lh-link" style={{ paddingTop: 10 }} aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? 'Show fewer' : `Show all ${all.length}`}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function LowerHalf({ canMoves, canOrder }) {
  const { currentLocation } = useLocationContext();
  const { data: d } = useOverview();
  const place = currentLocation?.name ?? 'whole shop';
  const pair = [canMoves && 'moves', d?.stock && 'restock'].filter(Boolean);
  return (
    <div className="lh">
      <Waiting />
      {d?.tiedUp && <TiedUp t={d.tiedUp} place={place} />}
      {pair.length > 0 && (
        <div className={`lh-pair${pair.length === 1 ? ' one' : ''}`}>
          {canMoves && <Moves />}
          {d?.stock && <Restock stock={d.stock} canOrder={canOrder} />}
        </div>
      )}
    </div>
  );
}
