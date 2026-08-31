import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useLocationContext } from '../../contexts/LocationContext';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';

export default function TransfersPage() {
  const { locations } = useLocationContext();
  const [formData, setFormData] = useState({
    originLocationId: '',
    destinationLocationId: '',
    notes: ''
  });
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    // Load variants for selection
    const loadVariants = async () => {
      try {
        const res = await api.get('/variants');
        setVariants(res.data);
      } catch (err) {
        toast.error('Failed to load variants');
      }
    };
    loadVariants();
  }, []);

  const addItem = () => {
    setItems([...items, { variantId: '', quantity: 1 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.originLocationId || !formData.destinationLocationId) {
      return toast.error('Please select origin and destination locations');
    }
    if (formData.originLocationId === formData.destinationLocationId) {
      return toast.error('Origin and destination cannot be the same');
    }
    if (items.length === 0) {
      return toast.error('Please add at least one item to transfer');
    }

    try {
      setIsSubmitting(true);
      await api.post('/inventory-transfers', {
        ...formData,
        items: items.map(item => ({ ...item, quantity: parseInt(item.quantity) || 0 }))
      });
      toast.success('Stock transferred successfully');
      setFormData({ originLocationId: '', destinationLocationId: '', notes: '' });
      setItems([]);
    } catch (error) {
      toast.error(error?.error || 'Failed to transfer stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Stock Transfer</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Move inventory between your locations.</p>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
            <div className="form-group">
              <label>Origin Location</label>
              <select required className="input" value={formData.originLocationId} onChange={e => setFormData({...formData, originLocationId: e.target.value})}>
                <option value="">Select origin...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                ))}
              </select>
            </div>
            
            <div style={{ paddingTop: '24px', color: 'var(--text-secondary)' }}>
              <ArrowRight size={24} />
            </div>

            <div className="form-group">
              <label>Destination Location</label>
              <select required className="input" value={formData.destinationLocationId} onChange={e => setFormData({...formData, destinationLocationId: e.target.value})}>
                <option value="">Select destination...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Transfer Notes</label>
            <input type="text" className="input" placeholder="Optional notes about this transfer" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 500 }}>Items to Transfer</h3>
              <button type="button" className="btn-secondary" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                No items added yet. Click "Add Item" to begin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select required className="input" value={item.variantId} onChange={e => updateItem(index, 'variantId', e.target.value)} style={{ flex: 1 }}>
                      <option value="">Select a variant...</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.sku} - {v.product?.title}</option>
                      ))}
                    </select>
                    <input required type="number" min="1" className="input" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} style={{ width: '120px' }} placeholder="Qty" />
                    <button type="button" className="btn-icon" style={{ color: '#ef4444' }} onClick={() => removeItem(index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
