import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, MapPin, Search } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';

export default function StockLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { refreshLocations } = useLocationContext();
  const { can } = usePermission();
  const canManage = can('admin:locations');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORE',
    active: true
  });

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const data = await api.get('/locations');
      setLocations(data);
    } catch (error) {
      console.error('Fetch locations error:', error);
      const msg = error?.error || error?.message || String(error) || 'Failed to load locations';
      setErrorMsg(msg);
      toast.error(msg);
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
      refreshLocations();
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

  const filteredLocations = (locations || []).filter(loc => 
    (loc?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (loc?.code || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
      <div className="animate-spin" style={{ marginRight: '8px' }}>◌</div> Loading locations...
    </div>
  );

  if (errorMsg) return (
    <div style={{ padding: '48px', color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid var(--accent-danger)' }}>
      <h3 style={{ marginBottom: '8px' }}>Error Loading Locations</h3>
      <p>{errorMsg}</p>
      <button onClick={fetchLocations} className="btn-primary" style={{ marginTop: '16px' }}>Retry</button>
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: '8px', display: 'flex', color: 'var(--primary-color)' }}>
              <MapPin size={20} />
            </div>
            Stock Locations
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
            Manage your physical stores, warehouses, and virtual fulfillment centers. 
            Ensure codes are unique across your enterprise.
          </p>
        </div>
        
        {canManage && (
          <button className="btn-primary" onClick={openNewModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', fontSize: '14px' }}>
            <Plus size={18} /> Add Location
          </button>
        )}
      </div>

      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
          <Search size={16} />
        </div>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Search locations by name or code..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '36px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
        />
      </div>

      <div style={{ borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' }}>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Details</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              {canManage && <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLocations.map(loc => (
              <tr key={loc.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }} className="table-row-hover">
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px', fontSize: '15px' }}>{loc.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{loc.code}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', 
                    background: 'var(--bg-hover)', color: 'var(--text-secondary)', 
                    borderRadius: '6px', fontSize: '12px', fontWeight: 500 
                  }}>
                    {loc.type}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', 
                    background: loc.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: loc.active ? 'var(--accent-success)' : 'var(--accent-danger)', 
                    borderRadius: '6px', fontSize: '12px', fontWeight: 600 
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '6px' }}></span>
                    {loc.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button 
                        onClick={() => openEditModal(loc)}
                        style={{ color: 'var(--text-secondary)', transition: 'all 0.2s', padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(loc.id)}
                        style={{ color: 'var(--text-secondary)', transition: 'all 0.2s', padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredLocations.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MapPin size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500 }}>No locations found</p>
                  <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search or add a new location.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={() => setIsModalOpen(false)} />
          <div className="card" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: '480px', zIndex: 101, padding: '32px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)', borderRadius: '16px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>
              {editingLocation ? 'Edit Location' : 'Create New Location'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Location Name</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Downtown Store" />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Location Code (Unique)</label>
                <input required type="text" className="input-field" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g., DOWNTOWN-01" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Type</label>
                <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="STORE">Retail Store</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="ONLINE">Online / Virtual</option>
                </select>
              </div>
              
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Active Status</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Inactive locations hide from active inventory.</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: formData.active ? 'var(--accent-success)' : 'var(--border-focus)',
                    transition: '.3s', borderRadius: '24px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '18px', width: '18px', 
                      left: formData.active ? '22px' : '3px', bottom: '3px', 
                      backgroundColor: 'var(--bg-card)', transition: '.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>{editingLocation ? 'Save Changes' : 'Create Location'}</button>
              </div>
            </form>
          </div>
        </>
      )}
      
      <style>{`
        .table-row-hover:hover {
          background-color: var(--bg-hover) !important;
        }
      `}</style>
    </div>
  );
}
