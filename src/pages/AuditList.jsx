import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useStockCounts, useCreateStockCount } from '../hooks/useStockCounts';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../context/AuthContext';

export default function AuditList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useStockCounts();
  const createMutation = useCreateStockCount();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const result = await createMutation.mutateAsync({
        name: `${month} Full Count`,
        createdBy: user?.name || user?.id
      });
      // `result` is already the created stock count: api.ts unwraps the HTTP body to
      // { success, data }, and useCreateStockCount returns `.data` on top of that. Reading
      // `result.data.id` threw a TypeError that this catch swallowed into console.error --
      // so the audit was created and listed, but the app never navigated into it.
      navigate(`/inventory/audits/${result.id}`);
    } catch (error) {
      console.error("Failed to create audit:", error);
      toast.error(error?.message || 'Could not open the new audit.');
    } finally {
      setIsCreating(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>Inventory Audits</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Reconcile system inventory with physical stock.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleCreate}
          disabled={isCreating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isCreating ? <Clock size={16} className="animate-spin" /> : <Plus size={16} />} 
          New Audit
        </button>
      </motion.div>

      {/* List */}
      <motion.div variants={item} className="table-container mobile-no-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <PageLoader text="Loading audits..." />
        ) : data?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
            <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>No Audits Found</h3>
            <p>Start your first stock count to ensure inventory accuracy.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th>Audit Name</th>
                <th>Status</th>
                <th>Date</th>
                <th>Items</th>
                <th>Accuracy</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(audit => (
                <tr 
                  key={audit.id} 
                  style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                  onClick={() => navigate(`/inventory/audits/${audit.id}`)}
                  className="table-row-hover"
                >
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{audit.name}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                      backgroundColor: audit.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 
                                     audit.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                      color: audit.status === 'COMPLETED' ? 'var(--accent-success)' : 
                             audit.status === 'IN_PROGRESS' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                    }}>
                      {audit.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {audit._count?.items || 0} items
                    </span>
                  </td>
                  <td>
                    {audit.accuracy ? (
                      <span style={{ 
                        color: Number(audit.accuracy) >= 95 ? 'var(--accent-success)' : 'var(--accent-danger)',
                        fontWeight: '500',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        {Number(audit.accuracy) >= 95 && <CheckCircle2 size={14} />}
                        {Number(audit.accuracy).toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }}>
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}
