import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function LocationSettingsModal({ variant, onClose, onSaveSuccess }) {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // Local state to track edits before saving
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get('/locations');
        const locationsData = Array.isArray(res) ? res : (res.data || []);
        setLocations(locationsData);
        
        // Initialize settings state from variant.locationSettings or default to true/global
        const initialSettings = {};
        locationsData.forEach(loc => {
          const existing = variant.locationSettings?.find(s => s.locationId === loc.id);
          initialSettings[loc.id] = {
            isAvailable: existing ? existing.isAvailable : true,
            priceOverride: existing?.priceOverride || ''
          };
        });
        setSettings(initialSettings);
      } catch (err) {
        toast.error('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, [variant]);

  const handleSave = async (locationId) => {
    setSavingId(locationId);
    try {
      const data = settings[locationId];
      const payload = {
        isAvailable: data.isAvailable,
        priceOverride: data.priceOverride ? Number(data.priceOverride) : null
      };

      await api.patch(`/products/${variant.productId}/variants/${variant.id}/locations/${locationId}`, payload);
      toast.success('Location settings updated');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      toast.error(err?.message || 'Failed to update settings');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, backdropFilter: 'blur(4px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
        style={{ position: 'fixed', top: '50%', left: '50%', width: '500px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', zIndex: 1000, overflow: 'hidden' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Location Settings</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{variant.sku}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" size={24} color="var(--text-muted)" />
            </div>
          ) : locations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No locations found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {locations.map(loc => (
                <div key={loc.id} style={{ padding: '16px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{loc.name}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings[loc.id]?.isAvailable || false}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [loc.id]: { ...prev[loc.id], isAvailable: e.target.checked }
                        }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>Available</span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Price Override (₹)</label>
                      <input 
                        type="number"
                        placeholder="Global Price"
                        value={settings[loc.id]?.priceOverride || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [loc.id]: { ...prev[loc.id], priceOverride: e.target.value }
                        }))}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <button 
                      onClick={() => handleSave(loc.id)}
                      disabled={savingId === loc.id}
                      style={{ padding: '8px 12px', borderRadius: '4px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {savingId === loc.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
