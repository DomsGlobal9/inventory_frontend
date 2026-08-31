import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';

export default function StockLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshLocations } = useLocationContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORE',
    active: true
  });

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/locations');
      setLocations(data);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, formData);
        toast.success('Location updated successfully');
      } else {
        await api.post('/locations', formData);
        toast.success('Location created successfully');
      }
      setIsModalOpen(false);
      fetchLocations();
      refreshLocations(); // refresh global context so dropdown updates
    } catch (error) {
      toast.error(error?.error || 'Failed to save location');
    }
  };

  const openNewModal = () => {
    setEditingLocation(null);
    setFormData({ name: '', code: '', type: 'STORE', active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setEditingLocation(loc);
    setFormData({ name: loc.name, code: loc.code, type: loc.type, active: loc.active });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/locations/${id}`);
      toast.success('Location deleted successfully');
      fetchLocations();
      refreshLocations();
    } catch (error) {
      toast.error(error?.error || 'Failed to delete location');
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Stock Locations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your physical stores, warehouses, and virtual locations.</p>
        </div>
        <button className="btn-primary" onClick={openNewModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Code</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Type</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map(loc => (
              <tr key={loc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '12px 16px' }}>{loc.name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge" style={{ background: 'var(--bg-dark)', color: 'var(--text-secondary)' }}>
                    {loc.code}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>{loc.type}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge" style={{ background: loc.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: loc.active ? '#22c55e' : '#ef4444' }}>
                    {loc.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn-icon" onClick={() => openEditModal(loc)}><Edit2 size={16} /></button>
                    <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(loc.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No locations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={() => setIsModalOpen(false)} />
          <div className="card" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: '500px', zIndex: 101, padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{editingLocation ? 'Edit Location' : 'New Location'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Location Name</label>
                <input required type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Downtown Store" />
              </div>
              <div className="form-group">
                <label>Location Code (Unique)</label>
                <input required type="text" className="input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g., DOWNTOWN-01" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="STORE">Store</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="VIRTUAL">Virtual</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="loc-active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <label htmlFor="loc-active" style={{ margin: 0 }}>Active</label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Location</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
