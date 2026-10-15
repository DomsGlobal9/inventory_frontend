import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupplierSpend } from '../../hooks/useSupplierSpend';
import { formatINR } from '../../utils/formatUtils';
import { Truck } from 'lucide-react';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function SupplierSpendWidget() {
  const { data: spendData, isLoading, isError } = useSupplierSpend();
  const navigate = useNavigate();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load supplier data." height="400px" />;

  const suppliers = (spendData || []).slice(0, 10);

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Top Suppliers</h3>
        <button 
          className="btn-secondary" 
          style={{ padding: '4px 12px', fontSize: '12px' }}
          onClick={() => navigate('/inventory/suppliers')}
        >
          View All
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {suppliers.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            0 Open Purchase Orders
          </div>
        ) : (
          suppliers.map((supplier, index) => (
            <div 
              key={supplier.supplierId} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px',
                borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s',
                border: '1px solid var(--border-light)'
              }}
              onClick={() => navigate(`/inventory/suppliers/${supplier.supplierId}`)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  background: index < 3 ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-input)', 
                  color: index < 3 ? '#3b82f6' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' 
                }}>
                  #{index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {supplier.supplierName}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {supplier.supplierCode}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatINR(supplier.totalSpend)}
                </span>
                <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: '600' }}>
                  Total Spend
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
