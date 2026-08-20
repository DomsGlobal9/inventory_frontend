import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import PageLoader from '../components/PageLoader';

export default function AlertCenter() {
  const navigate = useNavigate();
  const { data, isLoading } = useAlerts();
  
  const [activeTab, setActiveTab] = useState('out_of_stock');

  if (isLoading) {
    return <PageLoader text="Loading Alerts..." />;
  }

  const outOfStock = data?.data?.outOfStock || [];
  const lowStock = data?.data?.lowStock || [];

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
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <tr key={v.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td>
                  <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{v.productTitle}</div>
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
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => navigate(`/products/${v.productId}`)}
                    >
                      View
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ background: 'var(--text-primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}
                      onClick={() => navigate('/inventory/purchase-orders/new', { 
                        state: { 
                          variantId: v.id, 
                          sku: v.sku, 
                          orderedQty: v.reorderQty || v.reorderLevel || 10,
                          title: v.productTitle
                        } 
                      })}
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
