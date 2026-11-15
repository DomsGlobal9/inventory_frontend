import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import Select from '../../components/common/Select';
import MoveStockModal from '../../components/inventory/MoveStockModal';
import StockInModal from '../../components/inventory/StockInModal';
import { qtyShown, isMeasured } from '../../lib/units';
import { AN_CSS, PageHead, StorePick, Seg, Loading, Problem, useAnalytics, useFilters, useIsPhone } from './shared';

/**
 * Running low: every variant low or out of stock in a store that carries it, with its sales rate there and how long
 * the stock left will last, and one action, shown only to somebody allowed to take it:
 *   Transfer N from <store>   another store holds stock above its own reorder level (inventory:transfer)
 *   Receive stock             fabric and weight; purchase orders count pieces (inventory:receive)
 *   Create purchase order     (purchase_order:create); several can be selected and ordered together
 *   Review reorder level      no sales here in 60 days, so the level is probably too high (product:update)
 * Opens on the store chosen at the top of the app, as the card shows it.
 */
const variantOf = (r) => [r.colour, r.size && !/^free$/i.test(r.size) ? r.size : null].filter(Boolean).join(' · ');
const cover = (r) => (r.soldOut ? 'Out of stock' : r.daysLeft == null ? 'No recent sales' : r.daysLeft === 0 ? 'Today' : r.daysLeft < 14 ? `${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'}` : `${Math.round(r.daysLeft / 7)} weeks`);
const rate = (r) => (r.perWeek > 0 ? `${isMeasured(r.soldBy) ? qtyShown(Math.round(r.perWeek), r.soldBy) : Math.round(r.perWeek * 10) / 10} sold per week` : 'No sales in the last 4 weeks');
const levelNote = (r) => (r.left < 0 ? 'Negative stock: recount required' : r.reorderLevel > 0 ? `Reorder level ${qtyShown(r.reorderLevel, r.soldBy)}` : 'No reorder level set');

export default function RunningLowPage() {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { locations, currentLocation, isLoading: storesLoading } = useLocationContext();
  const { can } = usePermission();
  const [get, set] = useFilters({ store: currentLocation?.id ?? 'all', state: 'all', sort: 'soonest' });
  const store = get('store'), state = get('state'), sort = get('sort');
  const { data, error, isLoading, isFetching, refetch } = useAnalytics('running-low', { ...(store !== 'all' ? { locationId: store } : {}), state, sort }, { enabled: !storesLoading });
  const [move, setMove] = useState(null);
  const [stockIn, setStockIn] = useState(null);
  const [ticked, setTicked] = useState({});
  const mayOrder = can('purchase_order:create');
  const done = () => { qc.invalidateQueries({ queryKey: ['analytics'] }); };
  const rowKey = (r) => `${r.variantId}|${r.locationId}`;
  const orderable = (data?.rows ?? []).filter(r => r.next.kind === 'ORDER');
  const selecting = mayOrder && orderable.length > 1;
  const tickedRows = orderable.filter(r => ticked[rowKey(r)]);
  const order = (rows) => navigate('/inventory/purchase-orders/new', {
    state: rows.length === 1
      ? { variantId: rows[0].variantId, sku: rows[0].sku, orderedQty: rows[0].next.quantity, title: rows[0].title, color: rows[0].colour, size: rows[0].size, locationId: rows[0].locationId }
      : { items: rows.map(r => ({ variantId: r.variantId, sku: r.sku, orderedQty: r.next.quantity, title: r.title, color: r.colour, size: r.size })) }
  });

  const action = (r) => {
    const n = r.next;
    if (n.kind === 'MOVE') {
      return can('inventory:transfer')
        ? <button type="button" className="btn-secondary an-step" onClick={() => setMove(r)}>Transfer {qtyShown(n.quantity, r.soldBy)} from {n.fromName}</button>
        : <span className="an-note">{qtyShown(n.quantity, r.soldBy)} available at {n.fromName}</span>;
    }
    if (n.kind === 'STOCK_IN') return can('inventory:receive') ? <button type="button" className="btn-secondary an-step" onClick={() => setStockIn(r)}>Receive stock</button> : <span className="an-note">Receipt required</span>;
    if (n.kind === 'SLOW') return can('product:update') ? <Link to={`/products/${r.productId}`} className="btn-secondary an-step">Review reorder level</Link> : <span className="an-note">Slow-moving</span>;
    return mayOrder ? <button type="button" className="btn-secondary an-step" onClick={() => order([r])}>Create purchase order</button> : <span className="an-note">Reorder required</span>;
  };
  const tick = (r) => (selecting && r.next.kind === 'ORDER'
    ? <input type="checkbox" className="an-tick" aria-label={`Select ${r.title} to order`} checked={!!ticked[rowKey(r)]} onChange={(e) => setTicked(t => ({ ...t, [rowKey(r)]: e.target.checked }))} />
    : selecting ? <span className="an-tick" aria-hidden="true" /> : null);
  const name = (r) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
      {tick(r)}
      <div style={{ minWidth: 0 }}>
        <Link to={`/products/${r.productId}`} className="an-row-name">{r.title}</Link>
        <div className="an-note">{[variantOf(r), rate(r)].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  );
  const onHand = (r) => <span className={r.soldOut ? 'an-out' : 'an-low'}>{qtyShown(r.left, r.soldBy)}</span>;

  return (
    <div className="an">
      <style>{AN_CSS}{`
        .an-step { padding: 7px 12px !important; font-size: 12.5px !important; white-space: nowrap; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; min-height: 36px; }
        .an-low { color: var(--accent-warning); font-weight: 800; } .an-out { color: var(--accent-danger); font-weight: 800; }
        .an-tick { width: 18px; height: 18px; margin-top: 2px; flex: none; accent-color: var(--ov-till); }
        .an-selbar.stuck { position: sticky; bottom: 0; z-index: 2; box-shadow: 0 -8px 16px -12px rgba(0,0,0,.25); }
        .an-selbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px -18px -18px; padding: 12px 18px; background: var(--bg-card); border-top: 1px solid var(--border-light); border-radius: 0 0 18px 18px; }
        @media (max-width: 640px) { .an-selbar { margin: 12px -14px -14px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); border-radius: 0 0 16px 16px; } }
        @media (max-width: 640px) { .an-row .an-step { width: 100%; min-height: 44px; font-size: 14px !important; } }
      `}</style>
      <PageHead title="Running low" subtitle={data ? `${data.store ? data.store.name : 'All stores'} · ${data.counts.low + data.counts.out} item${data.counts.low + data.counts.out === 1 ? '' : 's'} need attention` : null}>
        <Seg label="Show" options={[{ value: 'all', label: `All${data ? ` (${data.counts.low + data.counts.out})` : ''}` }, { value: 'low', label: `Low stock${data ? ` (${data.counts.low})` : ''}` }, { value: 'out', label: `Out of stock${data ? ` (${data.counts.out})` : ''}` }]} value={state} onChange={(v) => set({ state: v })} />
        <StorePick stores={locations} value={store} onChange={(v) => { setTicked({}); set({ store: v }); }} />
        <Select className="an-select" aria-label="Sort" value={sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="soonest">Sort: earliest stock-out</option>
          <option value="fewest">Sort: lowest stock</option>
          <option value="name">Sort: name</option>
        </Select>
      </PageHead>

      {error ? <Problem error={error} onRetry={refetch} /> : isLoading || !data ? <Loading /> : (
        <section className="ov-card" style={{ opacity: isFetching ? 0.6 : 1 }}>
          {data.rows.length === 0 ? (
            <p className="an-empty">{state === 'out' ? 'No items are out of stock' : state === 'low' ? 'No items are below their reorder level' : 'No items need attention'}{data.store ? ` at ${data.store.name}` : ''}. Items appear here when they reach their reorder level.</p>
          ) : phone ? (
            <div className="an-rows">
              {data.rows.map(r => (
                <div key={rowKey(r)} className="an-row">
                  <div className="an-row-top">{name(r)}<span className="an-row-fig">{onHand(r)}</span></div>
                  <div className="an-row-meta"><span>{r.store} · {cover(r)}</span><span>{levelNote(r)}</span></div>
                  {action(r)}
                </div>
              ))}
            </div>
          ) : (
            <table className="an-table">
              <thead><tr><th>Item</th><th>Store</th><th className="num">On hand</th><th className="num">Cover</th><th className="num">Action</th></tr></thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={rowKey(r)}>
                    <td>{name(r)}</td>
                    <td>{r.store}</td>
                    <td className="num">{onHand(r)}<div className="an-note">{levelNote(r)}</div></td>
                    <td className="num">{cover(r)}</td>
                    <td className="num">{action(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.capped && <p className="an-note" style={{ marginTop: 10 }}>Showing the first 500 items. Select a store to narrow the list.</p>}
          {selecting && (
            // Once something is selected it stays in view at the bottom of the screen, so the selection can always be ordered.
            <div className={`an-selbar${tickedRows.length ? ' stuck' : ''}`}>
              <span className="an-note">Select items to add them to a single purchase order.</span>
              <button type="button" className="btn-primary" style={phone ? { width: '100%', minHeight: 44 } : undefined} disabled={!tickedRows.length} onClick={() => order(tickedRows)}>
                Create purchase order{tickedRows.length ? ` (${tickedRows.length} selected)` : ''}
              </button>
            </div>
          )}
        </section>
      )}

      {move && (
        <MoveStockModal startWith={{ variantId: move.variantId, sku: move.sku }} startFrom={move.next.fromLocationId} startTo={move.locationId} startQuantity={move.next.quantity}
          onClose={() => { setMove(null); done(); }} />
      )}
      {stockIn && (
        <StockInModal variant={{ variantId: stockIn.variantId, sku: stockIn.sku, productTitle: stockIn.title, soldBy: stockIn.soldBy }} locationId={stockIn.locationId} locationName={stockIn.store}
          onClose={() => { setStockIn(null); done(); }} />
      )}
    </div>
  );
}
