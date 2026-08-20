import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Settings2, History, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInventoryVariants } from '../hooks/useInventory';
import PageLoader from '../components/PageLoader';
import StockInModal from '../components/inventory/StockInModal';
import StockOutModal from '../components/inventory/StockOutModal';
import AdjustModal from '../components/inventory/AdjustModal';

export default function InventoryOverview() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    lowStock: '',
    outOfStock: '',
    sortBy: 'updatedAt',
    order: 'desc',
    page: 1,
    limit: 50
  });

  const { data, isLoading } = useInventoryVariants(filters);
  const variants = data?.items || [];
  
  const [modalState, setModalState] = useState({ type: null, variant: null }); // type: 'IN', 'OUT', 'ADJUST'

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HEALTHY': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>🟢 Healthy</span>;
      case 'LOW_STOCK': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>🟡 Low Stock</span>;
      case 'OUT_OF_STOCK': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>🔴 Out of Stock</span>;
      case 'ARCHIVED': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>⚫ Archived</span>;
      default: return null;
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Inventory Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage stock levels, valuations, and adjustments.</p>
        </div>
        <div className="mobile-col" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate('/inventory/ledger')}
          >
            <History size={16} />
            View Ledger
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Search by SKU, Barcode, or Product Name" 
            className="input-field" 
            style={{ paddingLeft: '36px', width: '100%' }}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>
        
        <select className="input-field" style={{ width: '160px' }} value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">All Inventory</option>
          <option value="HEALTHY">🟢 Healthy</option>
          <option value="LOW_STOCK">🟡 Low Stock</option>
          <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
          <option value="ARCHIVED">⚫ Archived</option>
        </select>
        

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <select className="input-field" style={{ width: '180px' }} value={`${filters.sortBy}-${filters.order}`} onChange={(e) => {
              const [sortBy, order] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, order }));
            }}>
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="quantity-asc">Lowest Stock First</option>
              <option value="quantity-desc">Highest Stock First</option>
              <option value="inventoryValue-desc">Highest Value First</option>
              <option value="productTitle-asc">Product Name (A-Z)</option>
              <option value="sku-asc">SKU (A-Z)</option>
            </select>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto', flex: 1 }}>
        {isLoading ? (
          <PageLoader text="Loading inventory..." />
        ) : variants.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No inventory records found.
          </div>
        ) : (
          <motion.table variants={container} initial="hidden" animate="show" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Stock Qty</th>
                <th style={{ textAlign: 'right' }}>Avg Cost</th>
                <th style={{ textAlign: 'right' }}>Total Value</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(variant => (
                <motion.tr variants={item} key={variant.variantId}>
                  <td>
                    <div>
                      <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', color: 'var(--text-primary)' }}>{variant.productTitle}</p>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{variant.sku}</span>
                    </div>
                  </td>
                  <td>{variant.category}</td>
                  <td>{getStatusBadge(variant.inventoryStatus)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: variant.quantity <= 0 ? 'var(--accent-danger)' : 'inherit' }}>
                    {variant.quantity}
                  </td>
                  <td style={{ textAlign: 'right' }}>₹{variant.averageCost?.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '500' }}>₹{variant.inventoryValue?.toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', gap: '4px' }} onClick={() => setModalState({ type: 'IN', variant })}>
                        <Plus size={14} /> Receive
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', gap: '4px' }} onClick={() => setModalState({ type: 'OUT', variant })}>
                        <Minus size={14} /> Issue
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', gap: '4px' }} onClick={() => setModalState({ type: 'ADJUST', variant })}>
                        <Settings2 size={14} /> Adjust
                      </button>
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', gap: '4px' }} onClick={() => navigate(`/inventory/ledger?variantId=${variant.variantId}`)}>
                        <History size={14} /> Ledger
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        )}
      </div>

      {data?.pagination && data.pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '16px 0', borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Showing page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} total)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              disabled={data.pagination.page <= 1} 
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <button 
              className="btn-secondary" 
              disabled={data.pagination.page >= data.pagination.pages} 
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {modalState.type === 'IN' && (
        <StockInModal variant={modalState.variant} onClose={() => setModalState({ type: null, variant: null })} />
      )}
      {modalState.type === 'OUT' && (
        <StockOutModal variant={modalState.variant} onClose={() => setModalState({ type: null, variant: null })} />
      )}
      {modalState.type === 'ADJUST' && (
        <AdjustModal variant={modalState.variant} onClose={() => setModalState({ type: null, variant: null })} />
      )}
    </div>
  );
}
