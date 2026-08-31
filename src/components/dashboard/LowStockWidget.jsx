import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '../../hooks/useAlerts';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function LowStockWidget() {
  const { data: alertsData, isLoading, isError } = useAlerts();
  const navigate = useNavigate();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load stock alerts." height="400px" />;

  // Combine outOfStock and lowStock, take top 10
  const allAlerts = alertsData?.alerts || [];
  const outOfStock = allAlerts.filter(a => a.type === 'OUT_OF_STOCK');
  const lowStock = allAlerts.filter(a => a.type === 'LOW_STOCK');
  const criticalItems = [...outOfStock, ...lowStock].slice(0, 10);

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Low Stock Items</h3>
        <button 
          className="btn-secondary" 
          style={{ padding: '4px 12px', fontSize: '12px' }}
          onClick={() => navigate('/inventory/alerts')}
        >
          View All
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {criticalItems.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            All stock levels are healthy.
          </div>
        ) : (
          criticalItems.map(item => (
            <div 
              key={item.id} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px',
                borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s',
                background: item.quantity <= 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                border: item.quantity <= 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-light)'
              }}
              onClick={() => navigate(`/inventory/products/${item.productId}`)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.quantity <= 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent'}
            >
              <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.productTitle}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {item.sku}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: item.quantity <= 0 ? 'var(--accent-danger)' : 'var(--accent-gold)' }}>
                  {item.quantity} / {item.reorderLevel}
                </span>
                <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: '600' }}>
                  {item.quantity <= 0 ? 'Out of Stock' : 'Low Stock'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
