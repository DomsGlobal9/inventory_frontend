import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';

export default function TransfersPage() {
  const { locations } = useLocationContext();
  const { can } = usePermission();
  const [formData, setFormData] = useState({
    originLocationId: '',
    destinationLocationId: '',
    notes: ''
  });
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // The variant picker is scoped to whichever Origin is currently selected -- only
  // items with stock > 0 there are offered, since anything else can't actually be
  // transferred from that location. Refetches every time Origin changes.
  useEffect(() => {
    if (!formData.originLocationId) {
      setVariants([]);
      return;
    }
    let cancelled = false;
    const loadVariants = async () => {
      setIsLoadingVariants(true);
      try {
        const res = await api.get(`/inventory/variants?locationId=${formData.originLocationId}&limit=200`);
        if (cancelled) return;
        const inStock = (res?.data?.items || []).filter(v => v.quantity > 0);
        setVariants(inStock);
      } catch (err) {
        if (!cancelled) toast.error('Failed to load variants for this location');
      } finally {
        if (!cancelled) setIsLoadingVariants(false);
      }
    };
    loadVariants();
    return () => { cancelled = true; };
  }, [formData.originLocationId]);

  // Previously-picked items may not exist (or may not fit) at a newly-chosen Origin --
  // start the item list fresh rather than leave stale, now-invalid selections in place.
  const handleOriginChange = (value) => {
    setFormData(prev => ({
      ...prev,
      originLocationId: value,
      destinationLocationId: prev.destinationLocationId === value ? '' : prev.destinationLocationId
    }));
    setItems([]);
  };

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

  const availableFor = (variantId) => variants.find(v => v.variantId === variantId)?.quantity;

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
    for (const item of items) {
      const qty = parseInt(item.quantity) || 0;
      const available = availableFor(item.variantId);
      if (qty > (available ?? 0)) {
        return toast.error(`Only ${available ?? 0} available for that item at the origin location`);
      }
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
      toast.error(error?.message || 'Failed to transfer stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!can('inventory:transfer')) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        You don't have permission to transfer stock between locations.
      </div>
    );
  }

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
              <select required className="input" value={formData.originLocationId} onChange={e => handleOriginChange(e.target.value)}>
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
                {locations.filter(loc => loc.id !== formData.originLocationId).map(loc => (
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
              <button
                type="button"
                className="btn-secondary"
                onClick={addItem}
                disabled={!formData.originLocationId}
                title={!formData.originLocationId ? 'Select an Origin Location first' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            {!formData.originLocationId ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                Select an Origin Location to see what's available to transfer.
              </div>
            ) : isLoadingVariants ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                Loading available stock...
              </div>
            ) : variants.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                No stock available at this location to transfer.
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                No items added yet. Click "Add Item" to begin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item, index) => {
                  const available = availableFor(item.variantId);
                  return (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <select required className="input" value={item.variantId} onChange={e => updateItem(index, 'variantId', e.target.value)} style={{ flex: 1 }}>
                        <option value="">Select a variant...</option>
                        {variants.map(v => (
                          <option key={v.variantId} value={v.variantId}>{v.sku} - {v.productTitle} ({v.quantity} available)</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '120px' }}>
                        <input
                          required
                          type="number"
                          min="1"
                          max={available || undefined}
                          className="input"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                        />
                        {item.variantId && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Max: {available ?? 0}</span>
                        )}
                      </div>
                      <button type="button" className="btn-icon" style={{ color: '#ef4444' }} onClick={() => removeItem(index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
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
