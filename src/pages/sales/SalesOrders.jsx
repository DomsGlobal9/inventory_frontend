import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import { Search, Filter } from 'lucide-react';
import { formatINR } from '../../utils/formatUtils';

export default function SalesOrders() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const { data: orders, isLoading } = useSalesOrders({ status: statusFilter });

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: { bg: 'rgba(107, 114, 128, 0.1)', color: 'rgb(107, 114, 128)' },
      CONFIRMED: { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' },
      PARTIALLY_DISPATCHED: { bg: 'rgba(245, 158, 11, 0.1)', color: 'rgb(245, 158, 11)' },
      DISPATCHED: { bg: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span style={{
        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
        backgroundColor: style.bg, color: style.color, display: 'inline-block'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingTop: '24px', paddingBottom: '24px' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)' }}>Sales Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage draft orders, view confirmed sales, and track fulfillments.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: '200px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <select 
            className="input-field" 
            style={{ paddingLeft: '44px', width: '100%', appearance: 'none' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PARTIALLY_DISPATCHED">Partially Dispatched</option>
            <option value="DISPATCHED">Dispatched</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container mobile-no-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--surface-hover)' }}>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>ORDER NO</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>CUSTOMER</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>ITEMS</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>TOTAL</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px' }}>STATUS</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading orders...</td></tr>
            ) : orders?.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found.</td></tr>
            ) : (
              orders?.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500' }}>{order.orderNumber}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '500' }}>{order.customer?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created {new Date(order.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>{order.items?.length || 0}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '500' }}>{formatINR(Number(order.total))}</td>
                  <td style={{ padding: '16px 24px' }}>{getStatusBadge(order.status)}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
