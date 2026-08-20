import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, Search, MoreVertical, Building2, Phone, Mail, X } from 'lucide-react';
import { useSuppliers, useCreateSupplier } from '../hooks/useSuppliers';
import PageLoader from '../components/PageLoader';

export default function Suppliers() {
  const navigate = useNavigate();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', address: '' });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.supplierCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    await createSupplier.mutateAsync(newSupplier);
    setShowAddModal(false);
    setNewSupplier({ name: '', email: '', phone: '', address: '' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) return <PageLoader text="Loading suppliers..." />;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={24} style={{ color: 'var(--text-secondary)' }} />
            Suppliers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0' }}>Manage vendors and purchase order destinations</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Add Supplier
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
            placeholder="Search suppliers by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Grid */}
      <motion.div variants={itemVariants} style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', alignContent: 'start', paddingBottom: '32px' }}>
        {filteredSuppliers.map(supplier => (
          <div 
            key={supplier.id} 
            className="glass-panel" 
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer' }}
            onClick={() => navigate(`/inventory/suppliers/${supplier.id}`)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{supplier.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {supplier.supplierCode}
                  </span>
                </div>
              </div>
              <button style={{ color: 'var(--text-muted)' }}><MoreVertical size={16} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {supplier.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  {supplier.email}
                </div>
              )}
              {supplier.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  {supplier.phone}
                </div>
              )}
            </div>

            <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total POs</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{supplier._count?.purchaseOrders || 0}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: supplier.isActive ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No suppliers found.
          </div>
        )}
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}
            >
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
              
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Add New Supplier</h2>
              
              <form onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="input-label">Company Name *</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Address</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    style={{ resize: 'none' }}
                    value={newSupplier.address}
                    onChange={e => setNewSupplier({...newSupplier, address: e.target.value})}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSupplier.isPending}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {createSupplier.isPending ? 'Creating...' : 'Create Supplier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
