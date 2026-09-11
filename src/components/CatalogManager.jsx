import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Loader2, Save, RotateCcw, Lock, ChevronDown, Search } from 'lucide-react';
import { useCatalogItems, useAddCatalogItem, useUpdateCatalogItem, useDeleteCatalogItem } from '../hooks/useCatalogSettings';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function CatalogManager({ type }) {
  const { data: response, isLoading } = useCatalogItems();
  // Every write route on this screen is guarded by `admin:catalog` server-side. Roles
  // without it (SALES, WAREHOUSE) were still shown Add New, and every chip was a live
  // edit button opening a modal whose Save/Disable/Delete could only ever 403 -- so the
  // catalog looked editable to people who can only read it.
  const { hasPermission } = useAuth();
  const canManageCatalog = hasPermission('admin:catalog');
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
  // Shown only once someone has tried to save. Marking a field red before they have finished
  // typing it is nagging, not helping.
  const [showErrors, setShowErrors] = useState(false);

  // #RGB and #RRGGBB, which is what a colour input and a hand-typed value both produce.
  const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const labelError = !formData.label.trim() ? 'Give it a name.' : '';
  const hexError = type === 'COLOR' && !HEX_PATTERN.test(formData.hex.trim())
    ? 'Use a hex colour like #FF69B4.' : '';
  const cannotSave = Boolean(labelError || hexError);

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
    setFormData({ label: "", value: "", category: "", hex: "#000000" });
    setShowErrors(false);
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
    setShowErrors(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    // This used to be a bare `return` on an empty label: the button moved, nothing happened,
    // and the screen said nothing about why. Now the reason is on the field.
    if (cannotSave) { setShowErrors(true); return; }

    const finalValue = formData.value.trim() || formData.label.toUpperCase().replace(/\s+/g, '_');

    const payload = {
      type,
      label: formData.label,
      value: finalValue,
    };

    if (type === 'DRESS_TYPE') {
      // Send the key even when empty. Guarding on truthiness meant clearing the category
      // just omitted it from the payload, so the old value was left untouched and a
      // mis-categorised dress type could never be moved back to uncategorised.
      payload.category = formData.category || null;
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
        title: `Disable ${editingItem.label}?`,
        // Says what happens rather than asking whether they are sure. "Are you sure" is a
        // question nobody can answer without already knowing the consequence.
        message: `It stops appearing when someone is adding a product. Products already using ${editingItem.label} keep it and are not changed. You can turn it back on at any time.`,
        confirmText: `Disable ${editingItem.label}`,
        confirmStyle: 'warning',
        onConfirm: () => updateMutation.mutateAsync({ id: editingItem.id, isActive: false })
          .then(() => {
            setConfirmState({ isOpen: false });
            handleCloseModal();
          })
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
      title: `Delete ${editingItem.label}?`,
      message: `${editingItem.label} is removed from this ${getTypeName(type).toLowerCase()} list for good. Nothing is using it, so no product changes — but it cannot be brought back, and you would have to add it again from scratch.`,
      confirmText: `Delete ${editingItem.label}`,
      confirmStyle: 'danger',
      onConfirm: () => deleteMutation.mutateAsync(editingItem.id)
        .then(() => {
          setConfirmState({ isOpen: false });
          handleCloseModal();
        })
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
      onClick={canManageCatalog ? () => handleEditStart(item) : undefined}
      disabled={!canManageCatalog}
      title={canManageCatalog ? undefined : 'You do not have permission to edit the catalog'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: item.isActive ? 'var(--bg-input)' : 'transparent',
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
              background: 'var(--bg-input)', color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>
        {canManageCatalog && <button 
          onClick={handleAddStart}
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
            // --bg-card, not '#fff': the background is --primary-color, which is an alias
            // for --text-primary and therefore white in dark mode. See Settings.jsx.
            background: 'var(--primary-color)', color: 'var(--bg-card)', border: 'none', borderRadius: '8px',
            fontSize: '14px', cursor: 'pointer', fontWeight: 500, flexShrink: 0
          }}>
          <Plus size={16} /> Add New
        </button>}
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
            background: 'var(--bg-card)', width: '100%', maxWidth: '400px',
            borderRadius: '16px', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-modal)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {isEditing ? `Edit ${editingItem?.label}` : `Add ${getTypeName(type)}`}
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
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
                  style={{ width: '100%', padding: '12px 14px', border: `2px solid ${showErrors && labelError ? 'rgb(220, 38, 38)' : 'var(--text-primary)'}`, borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none' }}
                />
                {showErrors && labelError && (
                  <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'rgb(220, 38, 38)' }}>{labelError}</p>
                )}
              </div>

              {!isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Value/Code (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.value} 
                    onChange={e => setFormData({...formData, value: e.target.value})} 
                    placeholder={placeholders.value + " (Auto-generates)"}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}

              {type === 'COLOR' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Hex Color</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="color"
                      // The swatch cannot represent a half-typed value like "#FF6", and a
                      // colour input given one silently falls back to black -- so the picker
                      // keeps showing the last good colour while the text is being edited.
                      value={hexError ? (editingItem?.metadata?.hex || '#000000') : formData.hex}
                      onChange={e => setFormData({...formData, hex: e.target.value})}
                      title="Pick a colour"
                      style={{ width: '48px', height: '48px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={formData.hex}
                      onChange={e => setFormData({...formData, hex: e.target.value})}
                      spellCheck={false}
                      style={{ flex: 1, padding: '12px 14px', border: `2px solid ${showErrors && hexError ? 'rgb(220, 38, 38)' : 'var(--text-primary)'}`, borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500, outline: 'none', fontFamily: 'ui-monospace, Menlo, monospace' }}
                    />
                  </div>
                  {showErrors && hexError && (
                    <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'rgb(220, 38, 38)' }}>{hexError}</p>
                  )}
                </div>
              )}

              {type === 'DRESS_TYPE' && (
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Category</label>
                  <div 
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    style={{ 
                      width: '100%', padding: '12px 14px', border: '2px solid var(--text-primary)', 
                      borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-primary)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '15px', fontWeight: 500
                    }}
                  >
                    <span>
                      {formData.category === 'WOMEN' ? 'Women' : 
                       formData.category === 'MEN' ? 'Men' : 
                       formData.category === 'KIDS' ? 'Kids' : 
                       'Select Category...'}
                    </span>
                    <ChevronDown size={18} style={{ color: 'var(--text-primary)' }} />
                  </div>
                  
                  {categoryDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
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
                            padding: '12px 14px', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                            background: formData.category === opt.val ? 'var(--bg-hover)' : 'transparent',
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

              {/* Whether this is safe to delete, said on the screen.
                  It used to live in a `title` tooltip on the Delete button -- invisible until
                  you hover, and invisible altogether on a touch screen. That is the one fact
                  that decides whether the destructive button is even allowed, so a greyed-out
                  Delete with no stated reason is the worst version of it. */}
              {isEditing && (
                <div style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5,
                  background: editingItem?.usageCount > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-input)',
                  color: editingItem?.usageCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {editingItem?.usageCount > 0
                    ? <Lock size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'rgb(180, 120, 10)' }} />
                    : <Check size={15} style={{ flexShrink: 0, marginTop: '2px' }} />}
                  <span>
                    {editingItem?.usageCount > 0 ? (
                      <>
                        In use by <strong>{editingItem.usageCount}</strong>{' '}
                        {editingItem.usageCount === 1 ? 'product' : 'products'}.
                        {' '}Renaming it is fine and updates everywhere. It cannot be deleted —
                        disable it instead to take it out of the dropdowns while the existing
                        products keep it.
                      </>
                    ) : (
                      <>Not used by any product yet, so it is safe to delete.</>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
              {/* Disable and Delete are deliberately quieter than Save. They are the rare
                  actions on this screen; renaming is the common one. */}
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(() => {
                    const turningOff = editingItem?.isActive;
                    // Scoped to what is actually running: Save uses the same mutation, so a
                    // bare isPending spun this button while the user was saving a rename.
                    const busy = updateMutation.isPending
                      && updateMutation.variables?.isActive !== undefined;
                    return (
                      <button
                        onClick={handleToggleActive}
                        disabled={updateMutation.isPending}
                        style={{ background: 'transparent', border: '1px solid var(--border-light)', color: turningOff ? 'var(--text-secondary)' : 'rgb(22, 163, 74)', padding: '10px 16px', borderRadius: '8px', cursor: updateMutation.isPending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}
                      >
                        {busy
                          ? <><Loader2 size={16} className="animate-spin" /> {turningOff ? 'Disabling…' : 'Enabling…'}</>
                          // Not an X: that glyph already closes this modal in the corner, and
                          // having it also mean "disable" made three different ways to say no.
                          : <><RotateCcw size={16} /> {turningOff ? 'Disable' : 'Enable'}</>}
                      </button>
                    );
                  })()}

                  {/* Only offered when it is actually possible. A permanently disabled button
                      is a question the screen refuses to answer; the reason is stated above
                      instead, where there is room to say what to do about it. */}
                  {!(editingItem?.usageCount > 0) && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      style={{ background: 'transparent', border: 'none', color: 'rgb(220, 38, 38)', padding: '10px 12px', borderRadius: '8px', cursor: deleteMutation.isPending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}
                    >
                      {deleteMutation.isPending
                        ? <><Loader2 size={16} className="animate-spin" /> Deleting…</>
                        : <><Trash2 size={16} /> Delete</>}
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={handleCloseModal} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  // Never disabled on invalid input: a button that cannot be pressed and does
                  // not say why is the reason people think the screen is broken. Pressing it
                  // reveals what is wrong instead.
                  disabled={addMutation.isPending || updateMutation.isPending}
                  style={{ background: 'var(--text-primary)', color: 'var(--bg-card)', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, opacity: showErrors && cannotSave ? 0.6 : 1 }}
                >
                  {/* Save and Disable share one mutation, so this asks which of the two is
                      actually in flight -- otherwise both buttons spun for either action. */}
                  {addMutation.isPending
                    || (updateMutation.isPending && updateMutation.variables?.isActive === undefined)
                    ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
                    : <><Save size={18} /> Save</>}
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
