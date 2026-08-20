import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStockIn, useInventoryMetadata } from '../../hooks/useInventory';

export default function StockInModal({ variant, onClose }) {
  const { data: metadata } = useInventoryMetadata();
  const stockInMutation = useStockIn();

  const [formData, setFormData] = useState({
    quantity: '',
    unitCost: variant?.averageCost || '',
    reason: 'PURCHASE',
    referenceType: 'PURCHASE_ORDER',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (variant) {
      setFormData(prev => ({ ...prev, unitCost: variant.averageCost || '' }));
    }
  }, [variant]);

  if (!variant) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    stockInMutation.mutate({
      variantId: variant.variantId,
      quantity: Number(formData.quantity),
      unitCost: formData.unitCost ? Number(formData.unitCost) : undefined,
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
          backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderRadius: '12px',
          zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} /> Receive Stock</h3>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Receive stock for {variant.productTitle} ({variant.sku})</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '60vh' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" required min="1" className="input-field" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="e.g. 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost (₹)</label>
              <input type="number" step="0.01" min="0" className="input-field" value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: e.target.value})} placeholder="e.g. 150.00" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <select className="input-field" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required>
              {metadata?.inventoryReasons?.filter(r => ['PURCHASE', 'RETURN', 'INITIAL_STOCK', 'SUPPLIER_DELIVERY', 'PURCHASE_RECEIPT'].includes(r)).map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Reference Type</label>
              <input type="text" className="input-field" value={formData.referenceType} onChange={e => setFormData({...formData, referenceType: e.target.value})} placeholder="e.g. PURCHASE_ORDER" />
            </div>
            <div className="form-group">
              <label className="form-label">Reference No</label>
              <input type="text" className="input-field" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="e.g. PO-12345" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="input-field" rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..."></textarea>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={stockInMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stockInMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Receive Stock
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
