import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User, AlertCircle } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';

const CustomerModal = ({ isOpen, onClose, customer }) => {
  const isEditing = !!customer;
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  // What the server said when it refused, shown in the form rather than a toast that vanishes
  // while they are still reading it.
  const [saveError, setSaveError] = useState(null);

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
    setSaveError(null);
  }, [customer, isOpen]);

  if (!isOpen) return null;

  /**
   * Nothing was listening for a failure.
   *
   * Both mutations passed only onSuccess, so a rejected save did exactly nothing on screen: the
   * spinner stopped, the modal stayed open, and the form looked untouched. The person's only
   * reasonable conclusion is that the button did not register -- so they press it again.
   *
   * It went unnoticed while creating a customer could not really fail. It can now: the same
   * phone number twice comes back as "Priya Sharma (CUS-000041) is already saved with that
   * number", which is precisely the sentence they need and precisely the one that was being
   * thrown away.
   *
   * The interceptor in lib/api.ts rejects with the response BODY, so the server's sentence is
   * at error.message -- not error.response.data.message.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveError(null);
    const onError = (error) => setSaveError(
      error?.message || 'That did not save. Try again in a moment.'
    );
    if (isEditing) {
      updateMutation.mutate(
        { id: customer.id, data: formData },
        { onSuccess: onClose, onError }
      );
    } else {
      createMutation.mutate(formData, { onSuccess: onClose, onError });
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

          {saveError && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '12px 14px', borderRadius: '8px',
              background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--accent-danger, #ef4444)',
              color: 'var(--accent-danger, #ef4444)', fontSize: '14px', lineHeight: 1.45
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{saveError}</span>
            </div>
          )}

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
