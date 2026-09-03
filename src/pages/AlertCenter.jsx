import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, ArrowLeft, Download, Pin, X } from 'lucide-react';
import { useAlerts, useTogglePinAlert, useDeleteAlert, useMarkAlertRead } from '../hooks/useAlerts';
import PageLoader from '../components/PageLoader';
import { exportToCSV } from '../utils/csvUtils';

export default function AlertCenter() {
  const navigate = useNavigate();
  const { data, isLoading } = useAlerts();
  const togglePinAlert = useTogglePinAlert();
  const deleteAlert = useDeleteAlert();
  const markAlertRead = useMarkAlertRead();

  const [activeTab, setActiveTab] = useState('out_of_stock');

  if (isLoading) {
    return <PageLoader text="Loading Alerts..." />;
  }

  const allAlerts = data?.alerts || [];
  const outOfStock = allAlerts.filter(a => a.type === 'OUT_OF_STOCK');
  const lowStock = allAlerts.filter(a => a.type === 'LOW_STOCK');

  const handleExport = () => {
    const rows = (activeTab === 'out_of_stock' ? outOfStock : lowStock).map(v => ({
      Product: v.productTitle,
      SKU: v.sku,
      VariantCode: v.variantCode,
      Color: v.colorName,
      Size: v.size,
      CurrentStock: v.quantity,
      ReorderLevel: v.reorderLevel
    }));
    exportToCSV(rows, activeTab === 'out_of_stock' ? 'out_of_stock_alerts' : 'low_stock_alerts');
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" onClick={() => navigate('/')} style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>Inventory Alerts</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Review items that need immediate attention.</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Export Report
        </button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('out_of_stock')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            background: 'transparent',
            borderBottom: `2px solid ${activeTab === 'out_of_stock' ? 'var(--accent-danger)' : 'transparent'}`,
            color: activeTab === 'out_of_stock' ? 'var(--accent-danger)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'out_of_stock' ? '600' : '400',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          <AlertTriangle size={16} />
          Out of Stock ({outOfStock.length})
        </button>
        <button
          onClick={() => setActiveTab('low_stock')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            background: 'transparent',
            borderBottom: `2px solid ${activeTab === 'low_stock' ? 'var(--accent-gold)' : 'transparent'}`,
            color: activeTab === 'low_stock' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'low_stock' ? '600' : '400',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          <AlertCircle size={16} />
          Low Stock ({lowStock.length})
        </button>
      </motion.div>

      {/* Content */}
      <motion.div variants={item} className="table-container mobile-no-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Identifiers</th>
              <th>Color / Size</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'out_of_stock' ? outOfStock : lowStock).map(v => (
              <tr
                key={v.id}
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  background: v.isPinned ? 'rgba(212, 175, 55, 0.06)' : (!v.isRead ? 'rgba(239, 68, 68, 0.04)' : 'transparent')
                }}
              >
                <td>
                  <div style={{ fontWeight: !v.isRead ? '700' : '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!v.isRead && <span title="Unread" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-danger)', flexShrink: 0 }} />}
                    {v.isPinned && <Pin size={12} style={{ color: 'var(--accent-gold)' }} fill="var(--accent-gold)" />}
                    {v.productTitle}
                  </div>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{v.sku}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>{v.variantCode}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {v.hexCode && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.hexCode }} />}
                    <span>{v.colorName} • {v.size}</span>
                  </div>
                </td>
                <td>
                  <span style={{ 
                    fontWeight: '600', 
                    color: v.quantity <= 0 ? 'var(--accent-danger)' : 'var(--accent-gold)' 
                  }}>
                    {v.quantity}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--text-secondary)' }}>{v.reorderLevel}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      className="btn-icon"
                      title={v.isPinned ? 'Unpin' : 'Pin'}
                      onClick={() => togglePinAlert.mutate(v.id)}
                      style={{ color: v.isPinned ? 'var(--accent-gold)' : 'var(--text-muted)' }}
                    >
                      <Pin size={16} fill={v.isPinned ? 'var(--accent-gold)' : 'none'} />
                    </button>
                    <button
                      className="btn-icon"
                      title="Dismiss"
                      onClick={() => deleteAlert.mutate(v.id)}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        if (!v.isRead) markAlertRead.mutate(v.id);
                        navigate(`/products/${v.productId}`);
                      }}
                    >
                      View
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        if (!v.isRead) markAlertRead.mutate(v.id);
                        navigate('/inventory/purchase-orders/new', {
                          state: {
                            // v.id is this InventoryAlert's own id, not the variant's --
                            // the API response deliberately keeps them as separate fields
                            // (see inventory-alert.controller.ts) precisely so this
                            // wouldn't get confused, but it did: saving a PO built from
                            // this prefill would reference a non-existent variant.
                            variantId: v.variantId,
                            sku: v.sku,
                            orderedQty: v.reorderQty || v.reorderLevel || 10,
                            title: v.productTitle
                          }
                        });
                      }}
                    >
                      Create PO
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(activeTab === 'out_of_stock' ? outOfStock : lowStock).length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No alerts in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
