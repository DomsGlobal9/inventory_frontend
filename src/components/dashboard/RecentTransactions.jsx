import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecentTransactions } from '../../hooks/useRecentTransactions';
import { Box } from 'lucide-react';
import WidgetSkeleton from './WidgetSkeleton';
import ErrorCard from './ErrorCard';

export default function RecentTransactions() {
  const { data: transactions, isLoading, isError } = useRecentTransactions(10);
  const navigate = useNavigate();

  if (isLoading) return <WidgetSkeleton height="400px" />;
  if (isError) return <ErrorCard message="Failed to load transactions." height="400px" />;

  return (
    <div className="stat-card" style={{ gap: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>Recent Transactions</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {(!transactions || transactions.length === 0) ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
            No recent activity.
          </div>
        ) : (
          transactions.map(transaction => (
            <div 
              key={transaction.id} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px', transition: 'background-color 0.2s',
                border: '1px solid var(--border-light)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-input)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Box size={20} color="var(--text-secondary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {transaction.product} ({transaction.sku})
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ 
                    fontSize: '12px', 
                    margin: 0,
                    fontWeight: '500',
                    color: ['PURCHASE_RECEIPT', 'RETURN_RESTOCK', 'CYCLE_COUNT_UP'].includes(transaction.type) ? 'var(--accent-success)' : 
                           ['SALES_DISPATCH', 'DAMAGE_WRITE_OFF', 'CYCLE_COUNT_DOWN'].includes(transaction.type) ? 'var(--accent-danger)' : 
                           'var(--text-secondary)'
                  }}>
                    {transaction.type.replace(/_/g, ' ')}
                  </p>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
