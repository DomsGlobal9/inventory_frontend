import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, History, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInventoryTransactions } from '../hooks/useInventory';
import PageLoader from '../components/PageLoader';
import dayjs from 'dayjs';

export default function InventoryLedger() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVariantId = searchParams.get('variantId') || '';

  const [filters, setFilters] = useState({
    variantId: initialVariantId,
    page: 1,
    limit: 50
  });

  const { data, isLoading } = useInventoryTransactions(filters);
  // useInventoryTransactions already unwraps to the backend's `data` array directly
  // (GET /inventory/transactions returns { success, total, data: [...], page, limit }
  // — a flat array, unlike /inventory/variants' { items, pagination } shape). Reading
  // `data?.data` here was unwrapping twice; arrays have no `.data` property, so this
  // was always undefined and the ledger showed "No transactions found" regardless of
  // how much real history existed.
  const transactions = data || [];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const getReasonBadge = (reason) => {
    return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>{reason?.replace(/_/g, ' ')}</span>;
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'IN': return <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>IN</span>;
      case 'OUT': return <span style={{ color: 'var(--accent-danger)', fontWeight: '600' }}>OUT</span>;
      case 'ADJUSTMENT': return <span style={{ color: '#F59E0B', fontWeight: '600' }}>ADJ</span>;
      default: return <span>{type}</span>;
    }
  };

  return (
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '16px' }}>
        <div>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', marginBottom: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
            onClick={() => navigate('/inventory')}
          >
            <ArrowLeft size={16} />
            Back to Overview
          </button>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Inventory Ledger</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Immutable history of all stock movements.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        {initialVariantId && (
          <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>
            Viewing history for specific variant.
            <button 
              onClick={() => {
                navigate('/inventory/ledger', { replace: true });
                setFilters(prev => ({ ...prev, variantId: '' }));
              }}
              style={{ marginLeft: '12px', background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      <div className="table-container" style={{ overflowX: 'auto', flex: 1 }}>
        {isLoading ? (
          <PageLoader text="Loading ledger..." />
        ) : transactions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found.
          </div>
        ) : (
          <motion.table variants={container} initial="hidden" animate="show" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product & SKU</th>
                <th>Type</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Qty Change</th>
                <th style={{ textAlign: 'right' }}>Balance After</th>
                <th>Reference</th>
                <th>User / System</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <motion.tr variants={item} key={tx.id}>
                  <td>{dayjs(tx.createdAt).format('MMM D, YYYY HH:mm')}</td>
                  <td>
                    <div>
                      <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', color: 'var(--text-primary)' }}>{tx.variant?.product?.title}</p>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.variant?.sku}</span>
                    </div>
                  </td>
                  <td>{getTypeBadge(tx.type)}</td>
                  <td>{getReasonBadge(tx.reason)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: tx.quantity > 0 ? 'var(--accent-success)' : tx.quantity < 0 ? 'var(--accent-danger)' : 'inherit' }}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '500' }}>
                    {tx.balanceAfter}
                  </td>
                  <td>
                    {tx.referenceType && tx.referenceId ? (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.referenceType}</span>
                        <p style={{ margin: 0, fontSize: '14px' }}>{tx.referenceId}</p>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    {tx.createdBy ? <span style={{ fontSize: '14px' }}>{tx.createdBy}</span> : <span style={{ color: 'var(--text-muted)' }}>System</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        )}
      </div>

      {/* GET /inventory/transactions returns flat { total, page, limit } fields, not a
          nested `pagination` object like /inventory/variants does — `data?.pagination`
          was always undefined here, so these controls never appeared even with more
          than one page of results. `data` is unwrapped to the array itself above, so
          the flat fields aren't reachable from the query result at all right now;
          computing `pages` from `total`/`limit` client-side, using filters.page as the
          current page since that's the value we actually control. */}
      {transactions.length > 0 && transactions.length >= filters.limit && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '16px 0', borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Page {filters.page}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
