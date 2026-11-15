import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLocationContext } from '../../contexts/LocationContext';
import Select from '../../components/common/Select';
import { AN_CSS, PageHead, Stat, Tag, Loading, Problem, useAnalytics, useFilters, useIsPhone, amountText } from './shared';
import { qtyShown } from '../../lib/units';

/**
 * Stock on hand: the Stock on hand card, for every store. Pieces and fabric per store, and its variants in stock /
 * low / out (out only for what that store carries); then each category across the largest stores. A category can be
 * selected to look at just that. A store opens its inventory; its low and out counts open Running low for that store.
 */
const COLS = 4; // stores shown as columns in the category table; the rest are summed as "Other stores"

function StatusBar({ s }) {
  const all = Math.max(1, s.plenty + s.low + s.out);
  return (
    <span className="an-bar" style={{ display: 'flex' }} role="img" aria-label={`${s.plenty} in stock, ${s.low} low stock, ${s.out} out of stock`}>
      <span style={{ width: `${(s.plenty / all) * 100}%`, background: 'var(--ov-till)', borderRadius: 0 }} />
      <span style={{ width: `${(s.low / all) * 100}%`, background: 'var(--accent-warning)', borderRadius: 0 }} />
      <span style={{ width: `${(s.out / all) * 100}%`, background: 'var(--accent-danger)', borderRadius: 0 }} />
    </span>
  );
}

export default function StockOnHandPage() {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const { currentLocation, setCurrentLocationId } = useLocationContext();
  const [get, set] = useFilters({ group: '' });
  const group = get('group');
  const [showEmpty, setShowEmpty] = useState(false);
  const { data, error, isLoading, isFetching, refetch } = useAnalytics('stock-on-hand', group ? { group } : {});
  const t = data?.totals;
  const open = (s) => { setCurrentLocationId(s.id); navigate('/inventory'); };
  const cols = data?.stores.slice(0, COLS) ?? [];
  const rest = data?.stores.slice(COLS) ?? [];
  const sum = (cells) => cells.reduce((a, c) => (c ? { pieces: a.pieces + c.pieces, fabricCm: a.fabricCm + c.fabricCm, weightG: a.weightG + c.weightG } : a), { pieces: 0, fabricCm: 0, weightG: 0 });
  const cell = (c) => (c && (c.pieces || c.fabricCm || c.weightG) ? amountText(c) : '—');
  const counts = (s) => (
    <>
      {s.plenty} in stock · {s.low > 0 ? <Link className="an-link" to={`/analytics/running-low?store=${s.id}&state=low`}>{s.low} low</Link> : '0 low'} · {s.out > 0 ? <Link className="an-link" to={`/analytics/running-low?store=${s.id}&state=out`}>{s.out} out</Link> : '0 out'}
    </>
  );
  const tags = (s) => <>{currentLocation?.id === s.id && <Tag>Current store</Tag>}{!s.active && <Tag tone="muted">Inactive</Tag>}</>;

  return (
    <div className="an">
      <style>{AN_CSS}</style>
      <PageHead title="Stock on hand" subtitle="All stores">
        <Select className="an-select" aria-label="Category" value={group} onChange={(e) => set({ group: e.target.value })}>
          <option value="">All categories</option>
          {(data?.groups ?? (group ? [group] : [])).map(g => <option key={g} value={g}>{g}</option>)}
        </Select>
      </PageHead>

      {error ? <Problem error={error} onRetry={refetch} /> : isLoading || !data ? <Loading /> : (
        <div className="an" style={{ opacity: isFetching ? 0.6 : 1 }}>
          <div className="an-grid4">
            <Stat label="Pieces" value={t.pieces.toLocaleString('en-IN')} note={group || 'All categories'} />
            <Stat label="Fabric" value={t.fabricCm ? qtyShown(t.fabricCm, 'METRE') : '—'} note={t.weightG ? `and ${qtyShown(t.weightG, 'KILOGRAM')} by weight` : 'Sold by the metre'} />
            <Stat label="Low stock" value={t.low} tone={t.low ? 'warn' : undefined} note={`Variants, of ${t.colours.toLocaleString('en-IN')}`} />
            <Stat label="Out of stock" value={t.out} tone={t.out ? 'bad' : undefined} note="Active variants, all stores" />
          </div>

          <section className="ov-card">
            <div className="an-card-h"><h2>Stock by store</h2><span className="sp" />
              <span className="an-legend"><span><i style={{ background: 'var(--ov-till)' }} />In stock</span><span><i style={{ background: 'var(--accent-warning)' }} />Low</span><span><i style={{ background: 'var(--accent-danger)' }} />Out</span></span>
            </div>
            {data.stores.length === 0 ? <p className="an-empty">{group ? `No ${group} in stock.` : 'No stock on hand.'}</p>
              : phone ? (
                <div className="an-rows">
                  {data.stores.map(s => (
                    <div key={s.id} className={`an-row${currentLocation?.id === s.id ? ' mine' : ''}`}>
                      <div className="an-row-top">
                        <button type="button" className="an-row-name" onClick={() => open(s)} aria-label={`View the inventory at ${s.name}`}>{s.name}{tags(s)}</button>
                        <span className="an-row-fig">{amountText(s)}</span>
                      </div>
                      <StatusBar s={s} />
                      <div className="an-row-meta"><span>{counts(s)}</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="an-table">
                  <thead><tr><th>Store</th><th className="num">Stock</th><th style={{ width: '38%' }}>Variants this store carries</th></tr></thead>
                  <tbody>
                    {data.stores.map(s => (
                      <tr key={s.id} className={currentLocation?.id === s.id ? 'mine' : ''}>
                        <td><button type="button" className="an-row-name" onClick={() => open(s)} aria-label={`View the inventory at ${s.name}`}>{s.name}</button>{tags(s)}</td>
                        <td className="num">{amountText(s)}</td>
                        <td><StatusBar s={s} /><div className="an-note" style={{ marginTop: 6 }}>{counts(s)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            {data.emptyStores.length > 0 && (
              <>
                <button type="button" className="an-more" aria-expanded={showEmpty} onClick={() => setShowEmpty(v => !v)}>
                  {showEmpty ? 'Hide' : 'Show'} {data.emptyStores.length} store{data.emptyStores.length === 1 ? '' : 's'} with no {group || 'stock'}
                </button>
                {showEmpty && <p className="an-note" style={{ marginTop: 6 }}>{data.emptyStores.map(s => s.name).join(', ')}</p>}
              </>
            )}
          </section>

          {data.categories.length > 0 && (
            <section className="ov-card">
              <div className="an-card-h"><h2>Stock by category</h2></div>
              {phone ? (
                <div className="an-rows">
                  {data.categories.map(c => {
                    const top = cols.filter(s => cell(c.byStore[s.id]) !== '—').slice(0, 2);
                    return (
                      <div key={c.name} className="an-row">
                        <div className="an-row-top"><span className="an-row-name">{c.name}</span><span className="an-row-fig">{cell(sum(Object.values(c.byStore)))}</span></div>
                        {top.length > 0 && <div className="an-row-meta"><span>{top.map(s => `${s.name}: ${cell(c.byStore[s.id])}`).join(' · ')}</span></div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="an-table">
                    <thead><tr><th>Category</th>{cols.map(s => <th key={s.id} className="num">{s.name}</th>)}{rest.length > 0 && <th className="num">Other stores ({rest.length})</th>}<th className="num">Total</th></tr></thead>
                    <tbody>
                      {data.categories.map(c => (
                        <tr key={c.name}>
                          <td>{c.name}</td>
                          {cols.map(s => <td key={s.id} className="num">{cell(c.byStore[s.id])}</td>)}
                          {rest.length > 0 && <td className="num">{cell(sum(rest.map(s => c.byStore[s.id])))}</td>}
                          <td className="num"><b>{cell(sum(Object.values(c.byStore)))}</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
