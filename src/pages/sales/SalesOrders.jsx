import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import LoadFailed from '../../components/LoadFailed';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrderSearch, fetchOrdersForExport } from '../../hooks/useSalesOrders';
import { Search, FileOutput } from 'lucide-react';
import { formatINRExact } from '../../utils/formatUtils';
import OrderFilters, { ActiveFilters, SortMenu, LIST_KEYS, optionLabel, dateLabel } from '../../components/orders/OrderFilters';
import { usePermission } from '../../hooks/usePermission';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { COUNTER_PHONE_QUERY } from '../../hooks/useCounterSale';
import { ORDER_STATUS as STATUS } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';
import { useTillLocations } from '../../hooks/useTillLocations';
import BillsAtPosNote from '../../components/sales/BillsAtPosNote';

const PAYMENT = {
  PAID: { label: 'Paid', color: '16, 185, 129' },
  PART_PAID: { label: 'Part paid', color: '245, 158, 11' },
  REFUNDED: { label: 'Refunded', color: '107, 114, 128' },
  // Udhaar the shop gave up on at the till: nothing due, but not paid either.
  WRITTEN_OFF: { label: 'Written off', color: '220, 38, 38' }
};

const Pill = ({ label, color }) => (
  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: `rgba(${color}, 0.12)`, color: `rgb(${color})`, display: 'inline-block', whiteSpace: 'nowrap' }}>{label}</span>
);

/** Where an order came from, as a shop says it. */
const whereFrom = (order) => order.atCounter ? 'Counter'
  // A bill rung up on the ScaleEzy POS. It read as plain 'Order', the same as one typed in by hand.
  : order.sourceSystem === 'SCALEEZY_POS' ? 'POS till'
  : order.sourceSystem === 'SHOPIFY' ? 'Shopify'
  : order.channel === 'ONLINE' ? 'Online'
  : order.channel === 'MARKETPLACE' ? 'Marketplace'
  : 'Order';

/**
 * Paid / ₹X due. Nothing for a Shopify order (paid on Shopify) or a cancelled or draft order with
 * nothing paid (nothing is owed) -- the same rule as the Payment filter (services/order-filters).
 * An online-shop order paid on delivery shows its due: it hid behind "—" while the filter called it
 * Not paid (23 Oct).
 */
const paymentPill = (order) => {
  if (order.sourceSystem === 'SHOPIFY') return null;
  if ((order.status === 'CANCELLED' || order.status === 'DRAFT') && !(order.payment?.paid > 0)) return null;
  if (order.payment?.status === 'PART_PAID' || order.payment?.status === 'UNPAID') {
    return <Pill label={`${formatINRExact(order.payment.due)} due`} color="245, 158, 11" />;
  }
  const p = PAYMENT[order.payment?.status];
  return p ? <Pill {...p} /> : null;
};

/** A kept order from the till: waiting (with its promised day), past that day, or handed over. */
const keptPill = (order) => {
  const k = order.kept;
  if (!k) return null;
  const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (k.state === 'HANDED_OVER') return <Pill label={`Handed over${k.handedOverAt ? ` ${day(k.handedOverAt)}` : ''}`} color="107, 114, 128" />;
  if (k.state === 'OVERDUE') return <Pill label={`Kept · was due ${day(k.promisedAt)}`} color="220, 38, 38" />;
  return <Pill label={`Kept${k.promisedAt ? ` · collect ${day(k.promisedAt)}` : ''}`} color="99, 102, 241" />;
};

export default function SalesOrders() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const narrow = useMediaQuery('(max-width: 760px)');
  const phone = useMediaQuery(COUNTER_PHONE_QUERY);
  const { billsAtPos, storeName } = useTillLocations();
  /*
   * Search, filters and sort live in the page address, as on Products: Back returns to the same
   * list, a refresh keeps it, and "this month, still due" can be sent as a link. Lists travel joined
   * with "|" (services/order-filters splits them).
   */
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') ?? 'new';
  const num = (k) => (params.get(k) === null || params.get(k) === '' ? undefined : Number(params.get(k)));
  const filters = {
    ...Object.fromEntries(LIST_KEYS.map(k => [k, params.get(k) ? params.get(k).split('|') : []])),
    from: params.get('from') || undefined, to: params.get('to') || undefined,
    min: num('min'), max: num('max'), q: params.get('q') ?? ''
  };
  const setParam = (changes) => setParams(prev => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(changes)) {
      const s = Array.isArray(v) ? v.join('|') : v === undefined || v === null ? '' : String(v);
      s ? next.set(k, s) : next.delete(k);
    }
    return next;
  }, { replace: true });
  const setFilters = (f) => setParam({ ...Object.fromEntries(LIST_KEYS.map(k => [k, f[k] ?? []])), from: f.from, to: f.to, min: f.min, max: f.max });
  const clearAll = () => { setSearchText(''); setParam({ ...Object.fromEntries(LIST_KEYS.map(k => [k, []])), from: '', to: '', min: undefined, max: undefined, q: '' }); };

  // The search waits for typing to pause: a phone number is ten keystrokes.
  const [searchText, setSearchText] = useState(filters.q);
  useEffect(() => {
    if (searchText.trim() === filters.q) return undefined;
    const t = setTimeout(() => setParam({ q: searchText.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);
  // Back or Forward changed the search in the address: the box follows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (filters.q !== searchText.trim()) setSearchText(filters.q); }, [filters.q]);

  const asked = {
    q: filters.q || undefined, from: filters.from, to: filters.to, sort,
    ...Object.fromEntries(LIST_KEYS.map(k => [k, filters[k].join('|') || undefined])),
    min: filters.min !== undefined ? String(filters.min) : undefined, max: filters.max !== undefined ? String(filters.max) : undefined
  };
  /*
   * Fifty at a time, "Show more" for the next fifty. This page used to load the newest 500 and stop,
   * without saying so: an order older than that could only be found by searching for it.
   */
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useOrderSearch(asked);
  const firstPage = data?.pages?.[0];
  const summary = firstPage?.summary;
  const filtering = (filters.q || filters.from || filters.to || LIST_KEYS.some(k => filters[k].length) || filters.min !== undefined || filters.max !== undefined);
  const orders = (data?.pages ?? []).flatMap(p => (p?.orders ?? []).map(o => ({ ...o, kept: p.kept?.[o.id] ?? null })));

  // Every order the filters match, as an Excel file: built here, so nothing is stored anywhere.
  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const [{ rows }, XLSX] = await Promise.all([fetchOrdersForExport(asked), import('xlsx')]);
      const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
      const sheet = XLSX.utils.json_to_sheet(rows.map(r => ({
        'Order': r.orderNumber,
        'Bill no.': r.billNumber ?? '',
        'Date': day(r.date),
        'Time': new Date(r.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        'Store': r.store ?? '',
        'Where from': optionLabel('source', r.source),
        'Customer': r.customer ?? '',
        'Phone': r.phone ?? '',
        'Status': STATUS[r.status]?.label ?? r.status,
        'Pieces': r.pieces,
        'Total (₹)': r.total,
        'Paid (₹)': r.paid,
        'Refunded (₹)': r.refunded,
        'Written off (₹)': r.writtenOff,
        'Due (₹)': r.due,
        'Payment': r.payment ? optionLabel('payment', r.payment) : (r.source === 'SHOPIFY' ? 'Paid on Shopify' : 'Nothing owed'),
        'Kept order': r.kept ? optionLabel('kept', r.kept) : '',
        'Promised for': r.promisedAt ? day(`${r.promisedAt}T12:00:00Z`) : '',
        'Handed over': day(r.handedOverAt),
        'Courier': r.courier ?? '',
        'Tracking number': r.trackingNumber ?? '',
        'Delivered': day(r.deliveredAt)
      })));
      sheet['!cols'] = [12, 18, 13, 8, 16, 14, 24, 15, 12, 7, 11, 11, 12, 14, 10, 11, 22, 13, 13, 16, 22, 13].map(wch => ({ wch }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Orders');
      const when = dateLabel(filters.from, filters.to);
      XLSX.writeFile(book, `orders${when ? `-${when.replace(/[^\w]+/g, '-').toLowerCase()}` : ''}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} ${rows.length === 1 ? 'order' : 'orders'} downloaded`);
    } catch (e) {
      toast.error('The orders could not be downloaded. Try again in a moment.');
    } finally {
      setExporting(false);
    }
  };

  const th = { padding: '14px 20px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: 13 };
  const td = { padding: '14px 20px' };

  return (
    // One scroll for the whole page (.page-scroll): the orders table used to scroll in its own box, which on
    // a smaller laptop showed a third of the screen of orders under the header and filters.
    // The space above the title is the title's own, not the scroller's padding: padding there left a 24px
    // strip above the pinned filters (.pf-sticky sticks inside it) where rows showed through (23 Oct).
    <div className="mobile-no-scroll page-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0, paddingTop: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, marginBottom: 8, color: 'var(--text-primary)' }}>Sales Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sales at the counter, online and from Shopify, and what was paid.</p>
        </div>
        {/* Walk-in bills are made on the POS till (New sale left Inventory on 6 Oct 2026). The note
            says so where the button was, and whether this store has a till yet. */}
        {can('sales_order:counter_sale') && !phone && <BillsAtPosNote storeName={storeName} linked={billsAtPos} />}
      </div>

      <div className="pf-sticky">
        <div className="pf-top">
          <label className="pf-search" htmlFor="order-search">
            <Search size={16} aria-hidden="true" />
            <input id="order-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)}
              placeholder="Order or bill number, phone, name or item code" aria-label="Search orders" autoComplete="off" />
          </label>
        </div>
        <OrderFilters facets={firstPage?.facets} value={filters} onChange={setFilters} />
        <ActiveFilters value={filters} facets={firstPage?.facets} onChange={setFilters} onClearAll={clearAll} />
        {!isLoading && !isError && summary && (
          <div className="pf-count-line">
            <span aria-live="polite" style={{ opacity: isFetching && !isFetchingNextPage ? 0.6 : 1 }}>
              {summary.count} {summary.count === 1 ? 'order' : 'orders'} · {formatINRExact(summary.total)} in sales
              {summary.due > 0 && <> · <span style={{ color: 'rgb(245, 158, 11)' }}>{formatINRExact(summary.due)} due</span></>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <SortMenu sort={sort} onChange={(s) => setParam({ sort: s === 'new' ? '' : s })} />
              <button type="button" className="btn-secondary" onClick={exportExcel} disabled={exporting || !summary.count}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}>
                <FileOutput size={14} aria-hidden="true" />{exporting ? 'Preparing…' : 'Export to Excel'}
              </button>
            </span>
          </div>
        )}
      </div>

      {narrow ? (
        <div style={{ display: 'grid', gap: 10, overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</div>
            : isError ? <LoadFailed what="orders" error={error} onRetry={refetch} />
            : orders.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>{filtering ? <>No orders match these filters. <button type="button" className="pf-clear" onClick={clearAll}>Clear all</button></> : 'No orders yet.'}</div>
            : orders.map(order => (
              <button key={order.id} type="button" onClick={() => navigate(`/orders/${order.id}`)}
                style={{ textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, color: 'var(--text-primary)', display: 'grid', gap: 6, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{order.orderNumber}</span>
                  <span style={{ fontWeight: 600 }}>{formatINRExact(Number(order.total))}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {order.customer?.name} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {whereFrom(order)}{order.createdBy?.name ? ` · ${order.createdBy.name}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Pill {...(STATUS[order.status] || STATUS.DRAFT)} />
                  {paymentPill(order)}
                  {keptPill(order)}
                </div>
              </button>
            ))}
        </div>
      ) : (
        <div className="table-container mobile-no-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-hover)' }}>
                <th style={th}>ORDER NO</th>
                <th style={th}>CUSTOMER</th>
                <th style={th}>WHERE FROM</th>
                <th style={{ ...th, textAlign: 'right' }}>TOTAL</th>
                <th style={th}>STATUS</th>
                <th style={th}>PAYMENT</th>
                <th style={{ ...th, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</td></tr>
              ) : isError ? (<LoadFailed what="orders" error={error} onRetry={refetch} colSpan={7} />) : orders.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>{filtering ? <>No orders match these filters. <button type="button" className="pf-clear" onClick={clearAll}>Clear all</button></> : 'No orders yet.'}</td></tr>
              ) : (
                orders.map(order => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    {...rowLink(() => navigate(`/orders/${order.id}`), { label: `Open ${order.orderNumber}` })}
                  >
                    <td style={{ ...td, fontWeight: 500 }}>{order.orderNumber}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</div>
                    </td>
                    <td style={td}>
                      <div>{whereFrom(order)}</div>
                      {(order.createdBy?.name || order.location?.name) && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[order.location?.name, order.createdBy?.name && `by ${order.createdBy.name}`].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{formatINRExact(Number(order.total))}</td>
                    <td style={td}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Pill {...(STATUS[order.status] || STATUS.DRAFT)} />{keptPill(order)}</div></td>
                    <td style={td}>{paymentPill(order) ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button className="btn-secondary" onClick={() => navigate(`/orders/${order.id}`)} style={{ padding: '6px 12px', fontSize: 13 }}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && summary && (
        <div className="pf-more">
          <button type="button" className="btn-secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : `Show ${Math.min(50, summary.count - orders.length)} more · ${orders.length} of ${summary.count} shown`}
          </button>
        </div>
      )}
    </div>
  );
}
