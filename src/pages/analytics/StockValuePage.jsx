import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { AN_CSS, PageHead, Seg, Stat, Bar, Tag, Loading, Problem, Money, useAnalytics, useFilters, useIsPhone, rupees, shortRupees, share, amountText } from './shared';
import { qtyShown } from '../../lib/units';

/**
 * Stock value: the Stock value card, for every store at once. At cost (the card's figure, the same cost chain) or at
 * selling price; each store's stock and value with its share; stores with no stock folded away; the six-month trend;
 * and value by category. Selecting a store makes it the current store and opens its inventory.
 */
export default function StockValuePage() {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const { currentLocation, setCurrentLocationId } = useLocationContext();
  const [get, set] = useFilters({ basis: 'cost' });
  const basis = get('basis');
  const [showEmpty, setShowEmpty] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useAnalytics('stock-value', {});
  const t = data?.totals;
  const pick = (s) => (basis === 'cost' ? s.atCost : s.atPrice);
  const whole = t ? (basis === 'cost' ? t.atCost : t.atPrice) : 0;
  const trend = data?.trend ?? [];
  // The line spans at least 10% of the value, so a change of a few rupees reads as flat, not as a fall.
  const top = Math.max(...trend.map(p => p.value)), bottom = Math.min(...trend.map(p => p.value));
  const span = Math.max(top - bottom, Math.abs(top) * 0.1, 1);
  const lo = (top + bottom) / 2 - span / 2, hi = lo + span;
  const open = (s) => { setCurrentLocationId(s.id); navigate('/inventory'); };
  const tags = (s) => <>{currentLocation?.id === s.id && <Tag>Current store</Tag>}{!s.active && <Tag tone="muted">Inactive</Tag>}</>;
  const pt = (p, i) => [12 + (i / Math.max(1, trend.length - 1)) * 276, 14 + (1 - (p.value - lo) / Math.max(1, hi - lo)) * 74];

  return (
    <div className="an">
      <style>{AN_CSS}</style>
      <PageHead title="Stock value" subtitle="All stores">
        <Seg label="Valuation basis" options={[{ value: 'cost', label: 'At cost' }, { value: 'price', label: 'At selling price' }]} value={basis} onChange={(v) => set({ basis: v })} />
      </PageHead>

      {error ? <Problem error={error} onRetry={refetch} /> : isLoading || !data ? <Loading /> : (
        <div className="an" style={{ opacity: isFetching ? 0.6 : 1 }}>
          <div className="an-grid4">
            <Stat label="Value at cost" value={<Money value={t.atCost} compact={phone} />} note={trend.length > 1 && trend[0].value > 0 ? `${shortRupees(trend[0].value)} in ${new Date(`${trend[0].month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' })}` : 'All stores'} />
            <Stat label="Value at selling price" value={<Money value={t.atPrice} compact={phone} />} note={t.atPrice > t.atCost ? `${shortRupees(t.atPrice - t.atCost)} above cost` : 'All stores'} />
            <Stat label="Pieces" value={t.pieces.toLocaleString('en-IN')} note={`In ${data.stores.length} store${data.stores.length === 1 ? '' : 's'}`} />
            <Stat label="Fabric" value={t.fabricCm ? qtyShown(t.fabricCm, 'METRE') : '—'} note={t.weightG ? `and ${qtyShown(t.weightG, 'KILOGRAM')} by weight` : 'Sold by the metre'} />
          </div>

          <section className="ov-card">
            <div className="an-card-h"><h2>Value by store</h2><span className="sp" /><span className="an-note">{basis === 'cost' ? 'At cost' : 'At selling price'} · Select a store to view its inventory</span></div>
            {data.stores.length === 0 ? <p className="an-empty">No stock on hand. Received stock will appear here.</p>
              : phone ? (
                <div className="an-rows">
                  {data.stores.map(s => (
                    <div key={s.id} className={`an-row${currentLocation?.id === s.id ? ' mine' : ''}`}>
                      <div className="an-row-top">
                        <button type="button" className="an-row-name" onClick={() => open(s)} aria-label={`View the inventory at ${s.name}`}>{s.name}{tags(s)}</button>
                        <span className="an-row-fig"><Money value={pick(s)} compact /></span>
                      </div>
                      <Bar value={share(pick(s), whole)} label={`${Math.round(share(pick(s), whole))}% of the value`} />
                      <div className="an-row-meta"><span>{amountText(s)}</span><span>{Math.round(share(pick(s), whole))}%</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="an-table">
                  <thead><tr><th>Store</th><th className="num">Stock</th><th className="num">Value</th><th style={{ width: '26%' }}>Share</th><th aria-label="Open" /></tr></thead>
                  <tbody>
                    {data.stores.map(s => (
                      <tr key={s.id} className={`go${currentLocation?.id === s.id ? ' mine' : ''}`} tabIndex={0} role="link" aria-label={`View the inventory at ${s.name}`}
                        onClick={() => open(s)} onKeyDown={(e) => { if (e.key === 'Enter') open(s); }}>
                        <td><b>{s.name}</b>{tags(s)}</td>
                        <td className="num">{amountText(s)}</td>
                        <td className="num"><b>{rupees(pick(s))}</b></td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1 }}><Bar value={share(pick(s), whole)} label={`${Math.round(share(pick(s), whole))}% of the value`} /></span><span className="an-note" style={{ width: 34, textAlign: 'right' }}>{Math.round(share(pick(s), whole))}%</span></div></td>
                        <td className="num" style={{ color: 'var(--text-muted)', width: 24 }}><ChevronRight size={16} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            {data.emptyStores.length > 0 && (
              <>
                <button type="button" className="an-more" aria-expanded={showEmpty} onClick={() => setShowEmpty(v => !v)}>
                  {showEmpty ? 'Hide' : 'Show'} {data.emptyStores.length} store{data.emptyStores.length === 1 ? '' : 's'} with no stock
                </button>
                {showEmpty && <p className="an-note" style={{ marginTop: 6 }}>{data.emptyStores.map(s => s.name).join(', ')}</p>}
              </>
            )}
          </section>

          <div className="an-grid2">
            <section className="ov-card">
              <div className="an-card-h"><h2>Six-month trend</h2><span className="sp" /><span className="an-note">All stores, at cost</span></div>
              {trend.length < 2 ? <p className="an-empty">The trend will appear after the first full month.</p> : (
                <svg viewBox="0 0 300 122" width="100%" height="150" role="img" aria-label={`Stock value from ${rupees(trend[0].value)} to ${rupees(trend[trend.length - 1].value)}`}>
                  <polyline fill="none" stroke="var(--ov-till)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={trend.map((p, i) => pt(p, i).join(',')).join(' ')} />
                  {trend.map((p, i) => {
                    const [x, yy] = pt(p, i);
                    const anchor = i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle';
                    return (
                      <g key={p.month}>
                        <circle cx={x} cy={yy} r="3.5" fill="var(--ov-till)" />
                        <text x={x} y="106" textAnchor={anchor} fontSize="10" fill="var(--text-muted)">{new Date(`${p.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</text>
                        <text x={x} y="119" textAnchor={anchor} fontSize="10" fill="var(--text-secondary)">{shortRupees(p.value).replace(' ', '')}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </section>
            <section className="ov-card">
              <div className="an-card-h"><h2>Value by category</h2><span className="sp" /><span className="an-note">At cost</span></div>
              {data.categories.length === 0 ? <p className="an-empty">No stock on hand.</p> : (
                <div className="an-list">
                  {data.categories.map(c => (
                    <div key={c.name} className="an-li">
                      <span>{c.name}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}><Money value={c.atCost} compact={phone} /></b>
                      <span style={{ gridColumn: '1 / -1' }}><Bar value={share(c.atCost, t.atCost)} /></span>
                    </div>
                  ))}
                </div>
              )}
              {t.pricedNotCosted > 0 && (
                <p className="an-note" style={{ marginTop: 12 }}>
                  {t.pricedNotCosted.toLocaleString('en-IN')} pieces have no cost recorded and are valued at selling price. Record a unit cost when receiving stock.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
