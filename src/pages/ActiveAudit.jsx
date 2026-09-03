import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import { useStockCount, useStartStockCount, useUpdateStockCountItem, useCompleteStockCount } from '../hooks/useStockCounts';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function ActiveAudit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useStockCount(id);
  const startMutation = useStartStockCount();
  const updateMutation = useUpdateStockCountItem();
  const completeMutation = useCompleteStockCount();

  const [searchQuery, setSearchQuery] = useState('');
  // One <input> per audit row, so a scan can drop the cursor straight into the count box.
  const countInputRefs = useRef({});
  const [localCounts, setLocalCounts] = useState({});
  const [confirmState, setConfirmState] = useState({ isOpen: false });

  useEffect(() => {
    if (data?.items) {
      const counts = {};
      data.items.forEach(item => {
        counts[item.id] = item.countedQty ?? '';
      });
      setLocalCounts(counts);
    }
  }, [data]);

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCountChange = (itemId, value) => {
    setLocalCounts(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSaveItem = async (itemId) => {
    const value = localCounts[itemId];
    const original = data?.items?.find(i => i.id === itemId)?.countedQty ?? '';
    if (value === original) return; // unchanged -- don't fire a needless save

    // Clearing a count is a real, meaningful action -- it puts the item back to "not
    // yet counted" (countedQty: null on the server, which completeCount already treats
    // specially). Previously this just returned here with nothing saved, leaving the
    // input showing blank while the server still held the old count.
    const countedQty = value === '' ? null : Number(value);
    try {
      await updateMutation.mutateAsync({ countId: id, itemId, countedQty });
    } catch (error) {
      console.error(error);
    }
  };

  const handleComplete = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Complete Audit',
      message: 'Are you sure you want to complete this audit? This will generate automatic inventory adjustments for any discrepancies and cannot be undone.',
      confirmText: 'Complete Audit',
      onConfirm: async () => {
        try {
          await completeMutation.mutateAsync({ id, completedBy: user?.name || user?.id });
          navigate('/inventory/audits');
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  if (isLoading) return <PageLoader text="Loading Audit..." />;

  const audit = data;
  if (!audit) return <div style={{ padding: '32px' }}>Audit not found</div>;

  const filteredItems = audit.items?.filter(item => 
    item.variant.product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Hardware scanners type the code and then send Enter. Without handling that Enter the
  // scanned code stayed in the box, so the NEXT scan appended to it -- producing a
  // concatenated string that matched nothing and silently stalled the whole count.
  // On Enter: if the scan narrowed to exactly one row, clear the box and put the cursor
  // in that row's count field, ready for the quantity. That is the whole scan-count loop.
  const handleScanKey = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const scanned = searchQuery.trim();
    if (!scanned) return;

    if (filteredItems.length === 1) {
      const match = filteredItems[0];
      setSearchQuery('');
      // The row re-renders unfiltered, so wait a tick before reaching for its input.
      setTimeout(() => countInputRefs.current[match.id]?.focus(), 0);
    } else if (filteredItems.length === 0) {
      toast.error(`No item in this audit matches "${scanned}".`);
    } else {
      toast(`${filteredItems.length} items match "${scanned}" -- pick one below.`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" onClick={() => navigate('/inventory/audits')} style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>{audit.name}</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ 
                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                backgroundColor: audit.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 
                               audit.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                color: audit.status === 'COMPLETED' ? 'var(--accent-success)' : 
                       audit.status === 'IN_PROGRESS' ? 'var(--accent-gold)' : 'var(--text-secondary)'
              }}>
                {audit.status.replace('_', ' ')}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {audit.items?.length || 0} items to count
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {audit.status === 'DRAFT' && (
            <button className="btn-primary" onClick={handleStart} disabled={startMutation.isLoading}>
              Start Counting
            </button>
          )}
          {audit.status === 'IN_PROGRESS' && (
            <button 
              className="btn-primary" 
              onClick={handleComplete}
              disabled={completeMutation.isLoading}
              style={{ backgroundColor: 'var(--accent-success)', borderColor: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckCircle size={16} /> Complete Audit
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {audit.status === 'IN_PROGRESS' && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle size={20} color="var(--accent-gold)" />
          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
            Active stock movements during a count may cause reconciliation inaccuracies. It is recommended to pause order fulfillment while auditing.
          </span>
        </div>
      )}

      {/* Table Area */}
      <div className="glass-panel mobile-no-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* Toolbar */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '16px' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Scan barcode or search SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleScanKey}
              disabled={audit.status !== 'IN_PROGRESS'}
            />
          </div>
        </div>

        {/* List */}
        <div className="table-container mobile-no-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Product & Identifiers</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Expected</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Counted</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const counted = localCounts[item.id];
                const expected = item.expectedQty;
                const hasValue = counted !== '' && counted !== undefined && counted !== null;
                const diff = hasValue ? Number(counted) - expected : null;
                const concurrentChange = audit.status === 'IN_PROGRESS' && item.variant.quantity !== expected;
                
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.variant.product.title}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.sku}</span>
                        {item.barcode && <span style={{ color: 'var(--text-muted)' }}>{item.barcode}</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {expected}
                        </span>
                        {concurrentChange && (
                          <span 
                            title={`Inventory changed to ${item.variant.quantity} after audit started.`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                          >
                            <AlertTriangle size={10} /> Changed to {item.variant.quantity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="number"
                        min="0"
                        ref={(el) => { countInputRefs.current[item.id] = el; }}
                        value={counted}
                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                        onBlur={() => handleSaveItem(item.id)}
                        disabled={audit.status !== 'IN_PROGRESS'}
                        style={{ 
                          width: '80px', padding: '8px', textAlign: 'center', 
                          borderRadius: '6px', border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
                          fontWeight: '600', fontSize: '16px'
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasValue ? (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          backgroundColor: diff === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: diff === 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />
    </motion.div>
  );
}
