import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeadStock } from '../../hooks/useDeadStock';
import { formatINR } from '../../utils/formatUtils';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function DeadStockWidget() {
  const { data: deadStock, isLoading, isError } = useDeadStock();
  const navigate = useNavigate();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load dead stock data." height="400px" />;

  // Take top 10 highest value dead stock items
  const items = (deadStock || []).slice(0, 10);

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Dead Stock List</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {items.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            0 Dead Stock Items
          </div>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px',
                borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s',
                border: '1px solid var(--border-light)'
              }}
              onClick={() => navigate(`/inventory/products/${item.productId || item.productTitle}`)} // Navigating might need productId
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.productTitle}
                </h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {item.sku}
                  </p>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    {item.daysSinceLastMovement} days idle
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatINR(item.inventoryValue)}
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Qty: {item.quantity}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
