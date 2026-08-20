import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';

const CustomerModal = ({ isOpen, onClose, customer }) => {
  const isEditing = !!customer;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    gstNumber: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        companyName: customer.companyName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        gstNumber: customer.gstNumber || '',
        status: customer.status || 'ACTIVE'
      });
    } else {
      setFormData({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        gstNumber: '',
        status: 'ACTIVE'
      });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(
        { id: customer.id, data: formData },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(formData, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '12px', width: '500px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' }}>
        
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} />
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {isEditing ? 'Update customer details' : 'Enter customer details'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Contact Name <span style={{ color: 'red' }}>*</span></label>
            <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Jane Doe" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input type="text" className="input-field" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="e.g. Acme Corp (Optional)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="e.g. jane@example.com" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +1 555-0198" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">GST Number</label>
            <input type="text" className="input-field" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} placeholder="e.g. 29ABCDE1234F1Z5" />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CustomerModal;
