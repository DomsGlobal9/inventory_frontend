import React, { useState } from 'react';
import { X, Minus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStockOut, useInventoryMetadata } from '../../hooks/useInventory';
import Select from '../common/Select';


export default function StockOutModal({ variant, onClose }) {
  const { data: metadata } = useInventoryMetadata();
  const stockOutMutation = useStockOut();

  const [formData, setFormData] = useState({
    quantity: '',
    reason: 'SALE',
    referenceType: 'SALE_ORDER',
    reference: '',
    notes: ''
  });

  if (!variant) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    stockOutMutation.mutate({
      variantId: variant.variantId,
      quantity: Number(formData.quantity),
      reason: formData.reason,
      referenceType: formData.referenceType,
      reference: formData.reference,
      notes: formData.notes
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, y: '-50%', scale: 1, x: '-50%' }}
        exit={{ opacity: 0, scale: 0.95, y: '-40%', x: '-50%' }}
        style={{
          position: 'fixed', top: '50%', left: '50%', width: '90%', maxWidth: '500px',
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px',
          zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Minus size={20} /> Issue Stock</h3>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Issue stock for {variant.productTitle} ({variant.sku})</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '60vh' }}>
          
          <div className="form-group">
            <label className="form-label">Quantity to Deduct (Max: {variant.quantity})</label>
            <input type="number" required min="1" max={variant.quantity} className="input-field" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder={`e.g. ${Math.min(5, variant.quantity)}`} />
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <Select className="input-field" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required>
              {metadata?.inventoryReasons?.filter(r => ['SALE', 'DAMAGE', 'RETURN_TO_VENDOR', 'SAMPLE'].includes(r)).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>

          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Reference Type</label>
              <input type="text" className="input-field" value={formData.referenceType} onChange={e => setFormData({...formData, referenceType: e.target.value})} placeholder="e.g. SALE_ORDER" />
            </div>
            <div className="form-group">
              <label className="form-label">Reference No</label>
              <input type="text" className="input-field" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="e.g. SO-9923" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input-field" rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..."></textarea>
          </div>

          <div className="mobile-sticky-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={stockOutMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stockOutMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />}
              Issue Stock
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
