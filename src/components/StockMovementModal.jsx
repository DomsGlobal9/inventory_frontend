import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useVariants } from '../hooks/useVariants';
import toast from 'react-hot-toast';

export default function StockMovementModal({ isOpen, onClose, productId }) {
  const { data: variantsData, isLoading: variantsLoading } = useVariants(productId);
  const variants = variantsData?.data || [];
  const createMutation = useCreateTransaction(productId);

  const [formData, setFormData] = useState({
    variantId: '',
    type: 'IN',
    reason: 'PURCHASE',
    quantity: 1,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.variantId) return toast.error('Please select a variant');

    createMutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity)
    }, {
      onSuccess: () => {
        onClose();
        setFormData({ variantId: '', type: 'IN', reason: 'PURCHASE', quantity: 1, notes: '' });
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
      }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel" 
          style={{ width: '480px', padding: '32px', position: 'relative' }}
        >
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          
          <h2 style={{ margin: '0 0 24px', fontSize: '20px' }}>Record Stock Movement</h2>

          {variantsLoading ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading variants...</div>
          ) : variants.length === 0 ? (
            <div style={{ color: 'var(--accent-danger)' }}>Please create variants first before recording stock.</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Select SKU</label>
                <select 
                  className="input-field" 
                  value={formData.variantId}
                  onChange={e => setFormData({ ...formData, variantId: e.target.value })}
                  required
                >
                  <option value="">-- Choose a Variant --</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>{v.sku} ({v.size}, {v.colorName}) - Stock: {v.quantity}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Type</label>
                  <select 
                    className="input-field"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value, reason: e.target.value === 'IN' ? 'PURCHASE' : e.target.value === 'OUT' ? 'SALE' : 'MANUAL_CORRECTION' })}
                  >
                    <option value="IN">Stock IN</option>
                    <option value="OUT">Stock OUT</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Quantity</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min={formData.type === 'ADJUSTMENT' ? undefined : 1}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Reason</label>
                <select 
                  className="input-field"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                >
                  {formData.type === 'IN' && (
                    <>
                      <option value="PURCHASE">Purchase</option>
                      <option value="SUPPLIER_DELIVERY">Supplier Delivery</option>
                      <option value="INITIAL_STOCK">Initial Stock</option>
                      <option value="RETURN">Return</option>
                    </>
                  )}
                  {formData.type === 'OUT' && (
                    <>
                      <option value="SALE">Sale</option>
                      <option value="DAMAGE">Damage</option>
                    </>
                  )}
                  {formData.type === 'ADJUSTMENT' && (
                    <option value="MANUAL_CORRECTION">Manual Correction</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Notes (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Order ID, Supplier Name, etc."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={createMutation.isPending} style={{ marginTop: '8px', padding: '12px' }}>
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Confirm Transaction'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
