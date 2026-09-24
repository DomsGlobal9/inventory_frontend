import React, { useEffect, useState } from 'react';
import LoadFailed from '../../components/LoadFailed';
import { useNavigate } from 'react-router-dom';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import { Search, Filter, Plus, Store } from 'lucide-react';
import { formatINRExact } from '../../utils/formatUtils';
import Select from '../../components/common/Select';
import { usePermission } from '../../hooks/usePermission';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { COUNTER_PHONE_QUERY } from '../../hooks/useCounterSale';
import { ORDER_STATUS as STATUS } from '../../components/sales/labels';
import { rowLink } from '../../components/common/rowLink';

const PAYMENT = {
  PAID: { label: 'Paid', color: '16, 185, 129' },
  PART_PAID: { label: 'Part paid', color: '245, 158, 11' },
  REFUNDED: { label: 'Refunded', color: '107, 114, 128' }
};

const Pill = ({ label, color }) => (
  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: `rgba(${color}, 0.12)`, color: `rgb(${color})`, display: 'inline-block', whiteSpace: 'nowrap' }}>{label}</span>
);

/** Where an order came from, as a shop says it. */
const whereFrom = (order) => order.atCounter ? 'Counter'
  : order.sourceSystem === 'SHOPIFY' ? 'Shopify'
  : order.channel === 'ONLINE' ? 'Online'
  : order.channel === 'MARKETPLACE' ? 'Marketplace'
  : 'Order';

/** Paid / ₹X due -- only for orders that take money here. A Shopify order was paid on Shopify. */
const paymentPill = (order) => {
  if (!order.atCounter && !(order.payment?.paid > 0)) return null;
  if (order.payment?.status === 'PART_PAID' || order.payment?.status === 'UNPAID') {
    return <Pill label={`${formatINRExact(order.payment.due)} due`} color="245, 158, 11" />;
  }
  const p = PAYMENT[order.payment?.status];
  return p ? <Pill {...p} /> : null;
};

export default function SalesOrders() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const narrow = useMediaQuery('(max-width: 760px)');
  const phone = useMediaQuery(COUNTER_PHONE_QUERY);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');

  // The search waits for typing to pause: a phone number is ten keystrokes.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: orders, isLoading, isError, error, refetch } = useSalesOrders({ status: statusFilter, source: sourceFilter, search });

  const th = { padding: '14px 20px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: 13 };
  const td = { padding: '14px 20px' };

  return (
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 32, marginBottom: 8, color: 'var(--text-primary)' }}>Sales Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sales at the counter, online and from Shopify, and what was paid.</p>
        </div>
        {/* Not on a phone: selling is done from the counter computer or a tablet. */}
        {can('sales_order:counter_sale') && !phone && (
          <button className="btn-primary" onClick={() => navigate('/orders/new-sale')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> New sale
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="Order number, phone or name" aria-label="Search orders" style={{ paddingLeft: 44, width: '100%' }} />
        </div>
        <div style={{ position: 'relative', flex: '0 1 190px', minWidth: 150 }}>
          <Filter size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <Select className="input-field" style={{ paddingLeft: 44, width: '100%', appearance: 'none' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </Select>
        </div>
        <div style={{ position: 'relative', flex: '0 1 170px', minWidth: 140 }}>
          <Store size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <Select className="input-field" style={{ paddingLeft: 44, width: '100%', appearance: 'none' }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Where from">
            <option value="">From anywhere</option>
            <option value="COUNTER">Counter</option>
            <option value="SHOPIFY">Shopify</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
      </div>

      {narrow ? (
        <div style={{ display: 'grid', gap: 10, overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</div>
            : isError ? <LoadFailed what="orders" error={error} onRetry={refetch} />
            : orders?.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found.</div>
            : orders?.map(order => (
              <button key={order.id} type="button" onClick={() => navigate(`/orders/${order.id}`)}
                style={{ textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, color: 'var(--text-primary)', display: 'grid', gap: 6, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{order.orderNumber}</span>
                  <span style={{ fontWeight: 600 }}>{formatINRExact(Number(order.total))}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {order.customer?.name} · {new Date(order.createdAt).toLocaleDateString()} · {whereFrom(order)}{order.createdBy?.name ? ` · ${order.createdBy.name}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Pill {...(STATUS[order.status] || STATUS.DRAFT)} />
                  {paymentPill(order)}
                </div>
              </button>
            ))}
        </div>
      ) : (
        <div className="table-container mobile-no-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
              ) : isError ? (<LoadFailed what="orders" error={error} onRetry={refetch} colSpan={7} />) : orders?.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found.</td></tr>
              ) : (
                orders?.map(order => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    {...rowLink(() => navigate(`/orders/${order.id}`), { label: `Open ${order.orderNumber}` })}
                  >
                    <td style={{ ...td, fontWeight: 500 }}>{order.orderNumber}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString()} · {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</div>
                    </td>
                    <td style={td}>
                      <div>{whereFrom(order)}</div>
                      {(order.createdBy?.name || order.location?.name) && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[order.location?.name, order.createdBy?.name && `by ${order.createdBy.name}`].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{formatINRExact(Number(order.total))}</td>
                    <td style={td}><Pill {...(STATUS[order.status] || STATUS.DRAFT)} /></td>
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
    </div>
  );
}
