import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, MoreVertical, Building2, Calendar, Package, Truck, RefreshCw } from 'lucide-react';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import PageLoader from '../components/PageLoader';
import Suppliers from './Suppliers';
import ReorderSuggestions from './ReorderSuggestions';
import { usePermission } from '../hooks/usePermission';

export default function PurchaseOrders() {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermission();
  const activeTab =
    location.pathname.startsWith('/inventory/suppliers') ? 'suppliers'
    : location.pathname.startsWith('/inventory/reorder') ? 'reorder'
    : 'orders';
  const canSeeSuppliers = can('supplier:view');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/inventory/purchase-orders')}
          className="btn-tab"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: activeTab === 'orders' ? '600' : '500',
            color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'orders' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          <FileText size={16} />
          Orders
        </button>
        {canSeeSuppliers && (
          <button
            onClick={() => navigate('/inventory/suppliers')}
            className="btn-tab"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: activeTab === 'suppliers' ? '600' : '500',
              color: activeTab === 'suppliers' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'suppliers' ? '2px solid var(--accent-gold)' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            <Truck size={16} />
            Suppliers
          </button>
        )}
        {/* Sits with orders and suppliers because it is where an order starts: what is low,
            who supplies it, one action to draft the orders. */}
        <button
          onClick={() => navigate('/inventory/reorder')}
          className="btn-tab"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: activeTab === 'reorder' ? '600' : '500',
            color: activeTab === 'reorder' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'reorder' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          <RefreshCw size={16} />
          Reorder
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {activeTab === 'reorder' ? <ReorderSuggestions />
          : activeTab === 'suppliers' && canSeeSuppliers ? <Suppliers />
          : <PurchaseOrdersList />}
      </div>
    </div>
  );
}

function PurchaseOrdersList() {
  const navigate = useNavigate();
  const { data: pos = [], isLoading } = usePurchaseOrders();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPOs = pos.filter(po =>
    (po.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (po.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'var(--text-secondary)';
      case 'SENT': return '#3b82f6';
      case 'PARTIALLY_RECEIVED': return 'var(--accent-gold)';
      case 'RECEIVED': return 'var(--accent-success)';
      case 'CANCELLED': return 'var(--accent-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusLabel = (status) => {
    return status.replace('_', ' ');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) return <PageLoader text="Loading purchase orders..." />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
            Purchase Orders
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Manage inbound inventory from suppliers</p>
        </div>
        
        <button 
          onClick={() => navigate('/inventory/purchase-orders/new')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Create PO
        </button>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '40px' }}
            placeholder="Search POs by number or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="table-container mobile-no-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Items</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No purchase orders found.
                </td>
              </tr>
            ) : filteredPOs.map((po) => (
              <tr key={po.id} onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{po.poNumber}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{po.supplier?.name}</span>
                  </div>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    letterSpacing: '0.5px',
                    color: getStatusColor(po.status),
                    backgroundColor: `${getStatusColor(po.status)}20` // 20% opacity background
                  }}>
                    {getStatusLabel(po.status)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Package size={16} style={{ color: 'var(--text-muted)' }} />
                    {po._count?.items || 0}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    {new Date(po.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    style={{ color: 'var(--text-muted)' }}
                    onClick={(e) => { e.stopPropagation(); /* context menu */ }}
                  >
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
