import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { firstMissingField, missingFieldMessage } from '../../lib/formGuard';
import toast from 'react-hot-toast';
import { X, Save, Loader2, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCreateCustomer, useUpdateCustomer } from '../../hooks/useCustomers';
import { normalisePhone, formatPhone } from '../../utils/phone';

const EMPTY = { phone: '', name: '', email: '', companyName: '', gstNumber: '', status: 'ACTIVE' };

/**
 * Add or change a customer.
 *
 * Phone first, because that is how a counter works: "your number?" comes before "your name?", and
 * the number is what finds them next time. One number is one customer (backend lib/phone), so the
 * number is checked as it is typed, and a number somebody already has is answered with who they are
 * and a way to open them -- the person at the counter was almost certainly looking for that customer.
 *
 * `onSaved(customer)` is called with the saved customer, for screens that go on to use it.
 */
const CustomerModal = ({ isOpen, onClose, customer, onSaved }) => {
  const isEditing = !!customer;
  const navigate = useNavigate();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const phoneRef = useRef(null);

  // What the server said when it refused, shown in the form rather than a toast that vanishes
  // while they are still reading it. `existing` is set when the number already belongs to somebody.
  const [saveError, setSaveError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    setFormData(customer ? {
      phone: formatPhone(customer.phone) || '',
      name: customer.name || '',
      email: customer.email || '',
      companyName: customer.companyName || '',
      gstNumber: customer.gstNumber || '',
      status: customer.status || 'ACTIVE'
    } : EMPTY);
    setSaveError(null);
    setExisting(null);
    setPhoneTouched(false);
  }, [customer, isOpen]);

  if (!isOpen) return null;

  // A customer saved before phones were required may be changed without adding one; everybody else needs one.
  const phoneOptional = isEditing && !customer.phone;
  const phoneCheck = formData.phone.trim() ? normalisePhone(formData.phone) : null;
  // Said once there is enough to judge -- not on the first digit typed.
  const showPhoneCheck = phoneCheck && (phoneTouched || formData.phone.replace(/\D/g, '').length >= 10);

  const handleSubmit = (e) => {
    e.preventDefault();
    // The browser no longer draws this warning (the form carries noValidate) -- see
    // lib/formGuard. Same `required` fields, same rule, said in the app's own voice.
    const missing = firstMissingField(e.currentTarget);
    if (missing) { toast.error(missingFieldMessage(missing)); return; }

    if (!phoneOptional || formData.phone.trim()) {
      const checked = normalisePhone(formData.phone);
      if (!checked.ok) {
        setPhoneTouched(true);
        phoneRef.current?.focus();
        toast.error(checked.reason);
        return;
      }
    }

    setSaveError(null);
    setExisting(null);
    const payload = { ...formData };
    if (phoneOptional && !formData.phone.trim()) delete payload.phone;

    /*
     * The interceptor in lib/api.ts rejects with the response BODY, so the server's sentence is at
     * error.message -- not error.response.data.message. A 409 also carries who has the number.
     */
    const onError = (error) => {
      if (error?.existingCustomerId) {
        setExisting({ id: error.existingCustomerId, name: error.existingCustomerName || 'that customer' });
      }
      setSaveError(error?.message || 'That did not save. Try again in a moment.');
    };
    const onSuccess = (result) => {
      toast.success(isEditing ? 'Customer updated' : `${result?.data?.name || 'Customer'} added`);
      onSaved?.(result?.data);
      onClose();
    };
    if (isEditing) {
      updateMutation.mutate({ id: customer.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const label = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="customer-modal-title" style={{ background: 'var(--bg-card)', borderRadius: '12px', width: '520px', maxWidth: '100%', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxShadow: 'var(--shadow-modal)' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <h3 id="customer-modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} />
              {isEditing ? 'Edit customer' : 'Add customer'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {isEditing ? customer.customerCode : 'Customers are found by their phone number.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
          <div>
            <label htmlFor="customer-phone" style={label}>
              Phone {!phoneOptional && <span style={{ color: 'var(--accent-danger)' }}>*</span>}
            </label>
            <input
              id="customer-phone"
              ref={phoneRef}
              required={!phoneOptional}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus={!isEditing}
              maxLength={20}
              className="input-field"
              value={formData.phone}
              onChange={e => { setFormData({ ...formData, phone: e.target.value }); setExisting(null); setSaveError(null); }}
              onBlur={() => setPhoneTouched(true)}
              placeholder="e.g. 98480 22338"
              style={{ width: '100%' }}
            />
            {showPhoneCheck && (
              <p role="status" style={{ margin: '6px 0 0', fontSize: '12.5px', display: 'flex', gap: '6px', alignItems: 'flex-start', color: phoneCheck.ok ? 'var(--accent-success)' : 'var(--accent-warning, #f59e0b)' }}>
                {phoneCheck.ok ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />}
                <span>{phoneCheck.ok ? `Saved as ${formatPhone(phoneCheck.value)}` : phoneCheck.reason}</span>
              </p>
            )}
            {phoneOptional && !formData.phone.trim() && (
              <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                This customer has no phone number yet. Add it so they can be found at the counter.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="customer-name" style={label}>Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
            <input id="customer-name" required type="text" autoComplete="name" maxLength={120} className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Priya Sharma" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ minWidth: 0 }}>
              <label htmlFor="customer-email" style={label}>Email</label>
              <input id="customer-email" type="email" autoComplete="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Optional" style={{ width: '100%' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <label htmlFor="customer-company" style={label}>Company</label>
              <input id="customer-company" type="text" autoComplete="organization" className="input-field" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} placeholder="Optional, for business buyers" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label htmlFor="customer-gst" style={label}>GSTIN</label>
            <input id="customer-gst" type="text" maxLength={15} className="input-field" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} placeholder="Optional, for a business buyer's bill" style={{ width: '100%' }} />
          </div>

          {saveError && (
            <div role="alert" style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              padding: '12px 14px', borderRadius: '8px',
              background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--accent-danger, #ef4444)',
              color: 'var(--accent-danger, #ef4444)', fontSize: '14px', lineHeight: 1.45
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{saveError}</span>
              </div>
              {existing && (
                <button type="button" className="btn-secondary" onClick={() => { onClose(); navigate(`/customers/${existing.id}`); }} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Open {existing.name} <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEditing ? 'Save changes' : 'Add customer'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CustomerModal;
