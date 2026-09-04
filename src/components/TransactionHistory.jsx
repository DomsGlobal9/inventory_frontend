import React, { useState } from 'react';
import { Plus, Filter, Download, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTransactions } from '../hooks/useTransactions';
import Select from './common/Select';


export default function TransactionHistory({ productId, onNewTransaction }) {
  const [filters, setFilters] = useState({
    productId,
    type: '',
    reason: '',
    page: 1
  });

  const { data, isLoading } = useTransactions(filters);
  const transactions = data?.data || [];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleExport = () => {
    import('../utils/csvUtils').then(({ exportToCSV }) => {
      const exportData = transactions.map(t => ({
        ID: t.id,
        Date: new Date(t.createdAt).toISOString(),
        SKU: t.variant?.sku,
        Type: t.type,
        Reason: t.reason,
        QuantityChange: (t.balanceAfter > t.balanceBefore ? '+' : '') + (t.balanceAfter - t.balanceBefore),
        BalanceBefore: t.balanceBefore,
        BalanceAfter: t.balanceAfter,
        Notes: t.notes || ''
      }));
      exportToCSV(exportData, `Transactions_${productId || 'All'}`);
    });
  };

  if (isLoading) return <div style={{ padding: '32px' }}>Loading transaction history...</div>;

  return (
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      
      {/* Header & Actions */}
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <h3 style={{ margin: 0 }}>Inventory Ledger</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Track all stock movements.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleExport}
            disabled={!transactions.length}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            className="btn-primary" 
            onClick={onNewTransaction}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            Record Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mobile-col" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <Select 
            value={filters.type} 
            onChange={(e) => handleFilterChange('type', e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </Select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
          <Select 
            value={filters.reason} 
            onChange={(e) => handleFilterChange('reason', e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Reasons</option>
            <option value="PURCHASE">Purchase</option>
            <option value="SALE">Sale</option>
            <option value="DAMAGE">Damage</option>
            <option value="RETURN">Return</option>
            <option value="INITIAL_STOCK">Initial Stock</option>
            <option value="SUPPLIER_DELIVERY">Supplier Delivery</option>
            <option value="MANUAL_CORRECTION">Manual Correction</option>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      {transactions.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No transactions found.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '16px' }}>
          {/* Timeline connecting line */}
          <div style={{ position: 'absolute', left: '32px', top: '16px', bottom: '16px', width: '2px', backgroundColor: 'var(--border-light)', zIndex: 0 }} />
          
          <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}>
            {transactions.map(t => {
              const diff = t.balanceAfter - t.balanceBefore;
              const isPositive = diff > 0;
              const isNeutral = diff === 0;
              
              const color = isPositive ? 'var(--accent-success)' : isNeutral ? 'var(--text-secondary)' : 'var(--accent-danger)';
              const bgColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : isNeutral ? 'var(--bg-input)' : 'rgba(239, 68, 68, 0.1)';
              const Icon = isPositive ? ArrowUpRight : isNeutral ? Activity : ArrowDownRight;

              return (
                <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} key={t.id} style={{ display: 'flex', gap: '24px', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                  {/* Icon Node */}
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', backgroundColor: bgColor, color: color, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '4px solid var(--bg-card)'
                  }}>
                    <Icon size={18} />
                  </div>
                  
                  {/* Content Card */}
                  <div style={{ flex: 1, padding: '16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: color }}>
                          {isPositive ? '+' : ''}{diff}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                          {t.reason.replace('_', ' ')}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(t.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Variant SKU</div>
                        <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{t.variant?.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Running Stock</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{t.balanceAfter}</div>
                      </div>
                    </div>
                    
                    {t.notes && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {t.notes}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}
