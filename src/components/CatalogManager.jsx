import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Loader2, Save, RotateCcw, Lock, ChevronDown, Search } from 'lucide-react';
import { useCatalogItems, useAddCatalogItem, useUpdateCatalogItem, useDeleteCatalogItem } from '../hooks/useCatalogSettings';
import ConfirmModal from './ConfirmModal';

export default function CatalogManager({ type }) {
  const { data: response, isLoading } = useCatalogItems();
  const addMutation = useAddCatalogItem();
  const updateMutation = useUpdateCatalogItem();
  const deleteMutation = useDeleteCatalogItem();

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  
  const [formData, setFormData] = useState({ label: '', value: '', category: '', hex: '#000000' });
  const [searchQuery, setSearchQuery] = useState('');

  const itemsList = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
  const items = itemsList
    .filter(item => item.type === type)
    .filter(item => !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase()) || (item.value && item.value.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (a.category && b.category && a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.sortOrder !== b.sortOrder) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return (a.label || '').localeCompare(b.label || '');
    });

  const handleAddStart = () => {
    setIsEditing(false);
    setEditingItem(null);
    setFormData({ label: '', value: '', category: '', hex: '#000000' });
    setModalOpen(true);
  };

  const handleEditStart = (item) => {
    setIsEditing(true);
    setEditingItem(item);
    setFormData({
      label: item.label,
      value: item.value,
      category: item.category || '',
      hex: item.metadata?.hex || '#000000'
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!formData.label) return;

    const finalValue = formData.value.trim() || formData.label.toUpperCase().replace(/\s+/g, '_');

    const payload = {
      type,
      label: formData.label,
      value: finalValue,
    };

    if (type === 'DRESS_TYPE' && formData.category) {
      payload.category = formData.category;
    }

    if (type === 'COLOR') {
      payload.metadata = { hex: formData.hex };
    }

    if (isEditing && editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...payload }, {
        onSuccess: () => {
          handleCloseModal();
        }
      });
    } else {
      addMutation.mutate(payload, {
        onSuccess: () => {
          handleCloseModal();
        }
      });
    }
  };

  const handleToggleActive = () => {
    if (!editingItem) return;
    
    if (editingItem.isActive) {
      setConfirmState({
        isOpen: true,
        title: 'Disable Item',
        message: `Are you sure you want to disable "${editingItem.label}"? It will be hidden from dropdowns but kept for historical records.`,
        confirmText: 'Disable',
        confirmStyle: 'warning',
        onConfirm: () => {
          updateMutation.mutate({ id: editingItem.id, isActive: false }, {
            onSuccess: () => {
              setConfirmState({ isOpen: false });
              handleCloseModal();
            }
          });
        }
      });
    } else {
      updateMutation.mutate({ id: editingItem.id, isActive: true }, {
        onSuccess: () => handleCloseModal()
      });
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    
    setConfirmState({
      isOpen: true,
      title: 'Permanently Delete Item',
      message: `Are you sure you want to permanently delete "${editingItem.label}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteMutation.mutate(editingItem.id, {
          onSuccess: () => {
            setConfirmState({ isOpen: false });
            handleCloseModal();
          }
        });
      }
    });
  };

  const getPlaceholders = (catalogType) => {
    switch (catalogType) {
      case 'SIZE': return { label: 'e.g. Extra Small', value: 'e.g. XS' };
      case 'COLOR': return { label: 'e.g. Navy Blue', value: 'e.g. NAVY' };
      case 'DRESS_TYPE': return { label: 'e.g. Lehenga', value: 'e.g. LEHENGA' };
      case 'MATERIAL': return { label: 'e.g. Pure Silk', value: 'e.g. PURE_SILK' };
      case 'DESIGN_TYPE': return { label: 'e.g. Zari Work', value: 'e.g. ZARI' };
      case 'CATEGORY': return { label: 'e.g. Teens', value: 'e.g. TEENS' };
      case 'PRODUCT_TYPE': return { label: 'e.g. Custom Made', value: 'e.g. CUSTOM' };
      default: return { label: 'Label', value: 'Value' };
    }
  };
  const placeholders = getPlaceholders(type);

  const getTypeName = (catalogType) => {
    switch (catalogType) {
      case 'SIZE': return 'Size';
      case 'COLOR': return 'Color';
      case 'DRESS_TYPE': return 'Dress Type';
      case 'MATERIAL': return 'Material';
      case 'DESIGN_TYPE': return 'Design Type';
      case 'CATEGORY': return 'Category';
      case 'PRODUCT_TYPE': return 'Product Type';
      default: return 'Item';
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  const renderChip = (item) => (
    <button
      key={item.id}
      onClick={() => handleEditStart(item)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: item.isActive ? 'var(--bg-body)' : 'transparent',
        border: `1px solid ${item.isActive ? 'var(--border-light)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '24px',
        color: item.isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '14px',
        cursor: 'pointer',
        opacity: item.isActive ? 1 : 0.5,
        textDecoration: item.isActive ? 'none' : 'line-through',
        transition: 'all 0.2s',
      }}
      className="catalog-chip hover:border-[var(--primary-color)]"
    >
      {type === 'COLOR' && item.metadata?.hex && (
        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.metadata.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
      )}
      {item.label}
      {item.isSystem && <Lock size={12} style={{ color: 'var(--text-secondary)', marginLeft: '4px' }} />}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder={`Search ${getTypeName(type).toLowerCase()}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 12px 10px 36px', 
              border: '1px solid var(--border-light)', borderRadius: '8px', 
              background: 'var(--bg-body)', color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>
        <button 
          onClick={handleAddStart}
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
            background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '14px', cursor: 'pointer', fontWeight: 500, flexShrink: 0
          }}>
          <Plus size={16} /> Add New
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        {type === 'DRESS_TYPE' ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['WOMEN', 'MEN', 'KIDS', null].map(category => {
              const catItems = items.filter(i => (i.category || null) === category);
              if (catItems.length === 0) return null;
              
              return (
                <div key={category || 'UNTAGGED'} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {category || 'Uncategorized'}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {catItems.map(renderChip)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {items.map(renderChip)}
          </div>
        )}
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-surface)', width: '100%', maxWidth: '400px',
            borderRadius: '16px', border: '1px solid var(--border-light)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {isEditing ? `Edit ${editingItem?.label}` : `Add New ${getTypeName(type)}`}
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Label</label>
                <input 
                  autoFocus
                  type="text" 
                  value={formData.label} 
                  onChange={e => setFormData({...formData, label: e.target.value})} 
                  placeholder={placeholders.label}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-body)', color: 'var(--text-primary)' }}
                />
              </div>

              {!isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Value/Code (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.value} 
                    onChange={e => setFormData({...formData, value: e.target.value})} 
                    placeholder={placeholders.value + " (Auto-generates)"}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-body)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              {type === 'COLOR' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Hex Color</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="color" 
                      value={formData.hex} 
                      onChange={e => setFormData({...formData, hex: e.target.value})}
                      style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input 
                      type="text" 
                      value={formData.hex} 
                      onChange={e => setFormData({...formData, hex: e.target.value})} 
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-body)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {type === 'DRESS_TYPE' && (
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Category</label>
                  <div 
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    style={{ 
                      width: '100%', padding: '10px 12px', border: '1px solid var(--border-light)', 
                      borderRadius: '8px', background: 'var(--bg-body)', color: 'var(--text-primary)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <span>
                      {formData.category === 'WOMEN' ? 'Women' : 
                       formData.category === 'MEN' ? 'Men' : 
                       formData.category === 'KIDS' ? 'Kids' : 
                       'Select Category...'}
                    </span>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  
                  {categoryDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                      borderRadius: '8px', overflow: 'hidden', zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {[
                        { val: '', label: 'Select Category...' },
                        { val: 'WOMEN', label: 'Women' },
                        { val: 'MEN', label: 'Men' },
                        { val: 'KIDS', label: 'Kids' }
                      ].map(opt => (
                        <div 
                          key={opt.val}
                          onClick={() => {
                            setFormData({...formData, category: opt.val});
                            setCategoryDropdownOpen(false);
                          }}
                          style={{
                            padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                            background: formData.category === opt.val ? 'var(--bg-body)' : 'transparent',
                            color: formData.category === opt.val ? 'var(--primary-color)' : 'var(--text-primary)',
                            borderBottom: opt.val === '' ? '1px solid var(--border-light)' : 'none'
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleToggleActive}
                    disabled={updateMutation.isPending}
                    style={{ background: 'transparent', border: '1px solid var(--border-light)', color: editingItem?.isActive ? 'var(--text-secondary)' : 'rgb(22, 163, 74)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}
                  >
                    {editingItem?.isActive ? <><X size={16} /> Disable</> : <><RotateCcw size={16} /> Enable</>}
                  </button>
                  
                  <div title={editingItem?.usageCount > 0 ? `Used by ${editingItem.usageCount} products/variants. Disable instead.` : ''}>
                    <button 
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending || editingItem?.usageCount > 0}
                      style={{ 
                        background: 'transparent', 
                        border: '1px solid var(--border-light)', 
                        color: editingItem?.usageCount > 0 ? 'var(--text-disabled)' : 'rgb(220, 38, 38)', 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        cursor: editingItem?.usageCount > 0 ? 'not-allowed' : 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '14px', 
                        fontWeight: 500,
                        opacity: editingItem?.usageCount > 0 ? 0.5 : 1
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleCloseModal} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={addMutation.isPending || updateMutation.isPending} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
                  {(addMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />
    </div>
  );
}
