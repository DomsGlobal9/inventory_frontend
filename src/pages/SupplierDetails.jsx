import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Building, Calendar, FileText, IndianRupee, Clock, Package, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUpdateSupplier } from '../hooks/useSuppliers';
import { api } from '../lib/api';
import PageLoader from '../components/PageLoader';

export default function SupplierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const updateSupplier = useUpdateSupplier();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', isActive: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${id}`);
      return res;
    }
  });

  const supplier = data?.data;

  // Sync edit form when supplier data loads
  useEffect(() => {
    if (supplier && !showEditModal) {
      setEditForm({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        isActive: supplier.isActive !== false
      });
    }
  }, [supplier, showEditModal]);

  if (isLoading) return <PageLoader text="Loading Supplier Details..." />;
  if (error || !supplier) return <div style={{ padding: '32px', color: 'var(--accent-danger)' }}>Failed to load supplier.</div>;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await updateSupplier.mutateAsync({ id, data: editForm });
    setShowEditModal(false);
  };
  const metrics = supplier.metrics || { openOrders: 0, totalSpend: 0, totalOrders: 0, lastOrderDate: null };
  const purchaseOrders = supplier.purchaseOrders || [];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingBottom: '32px' }}>
      
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn-icon" onClick={() => navigate('/inventory/suppliers')} style={{ backgroundColor: 'var(--bg-card)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)' }}>{supplier.name}</h1>
            <span style={{ 
              padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
              backgroundColor: supplier.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: supplier.isActive ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              {supplier.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} /> {supplier.supplierCode}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-secondary" onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={16} /> Edit Supplier
          </button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Contact Info */}
        <motion.div variants={item} className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Contact Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: 'var(--text-muted)' }}><Mail size={18} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email Address</div>
                <div style={{ color: 'var(--text-primary)' }}>{supplier.email || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: 'var(--text-muted)' }}><Phone size={18} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Phone Number</div>
                <div style={{ color: 'var(--text-primary)' }}>{supplier.phone || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ color: 'var(--text-muted)' }}><MapPin size={18} /></div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Physical Address</div>
                <div style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>{supplier.address || '—'}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Aggregate Metrics */}
        <motion.div variants={item} className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>Procurement Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <FileText size={14} /> Total Orders
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>{metrics.totalOrders}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Package size={14} /> Open Orders
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--accent-gold)' }}>{metrics.openOrders}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <IndianRupee size={14} /> Total Spend
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
                ₹{metrics.totalSpend.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Calendar size={14} /> Last Order Date
              </div>
              <div style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', marginTop: '4px' }}>
                {metrics.lastOrderDate ? new Date(metrics.lastOrderDate).toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Purchase Orders */}
      <motion.div variants={item} className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Purchase Orders</h3>
          <button className="btn-primary" onClick={() => navigate('/inventory/purchase-orders')} style={{ padding: '6px 12px', fontSize: '13px' }}>
            New PO
          </button>
        </div>
        
        <div className="table-container mobile-no-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {purchaseOrders.length === 0 ? (
            <div style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>No purchase orders found for this supplier.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 10 }}>
                <tr>
                  <th>PO Number</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr 
                    key={po.id} 
                    style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                    onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                    className="table-row-hover"
                  >
                    <td><span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{po.poNumber}</span></td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                        backgroundColor: po.status === 'RECEIVED' ? 'rgba(16, 185, 129, 0.1)' : 
                                       (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') ? 'rgba(245, 158, 11, 0.1)' :
                                       po.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                        color: po.status === 'RECEIVED' ? 'var(--accent-success)' : 
                               (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') ? 'var(--accent-gold)' :
                               po.status === 'CANCELLED' ? 'var(--accent-danger)' : 'var(--text-secondary)'
                      }}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Clock size={14} /> {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '500' }}>
                        ₹{po.totalAmount ? Number(po.totalAmount).toLocaleString() : '0'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid var(--border-light)', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              <button 
                onClick={() => setShowEditModal(false)}
                className="btn-icon"
                style={{ position: 'absolute', top: '24px', right: '24px' }}
              >
                <X size={20} />
              </button>
              
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Edit Supplier</h2>
              
              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="input-label">Company Name *</label>
                  <input
                    required
                    type="text"
                    className="input-field"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={editForm.email}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={editForm.phone}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="input-label">Address</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    style={{ resize: 'none' }}
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                  ></textarea>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                  />
                  <label htmlFor="isActive" style={{ color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    Active Supplier
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateSupplier.isPending}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {updateSupplier.isPending ? 'Saving...' : 'Save Changes'}
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
