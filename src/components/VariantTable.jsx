import React, { useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Download, AlertTriangle, X, Copy, CheckCircle2, Printer, Info, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';
import { pdf } from '@react-pdf/renderer';
import { LabelDocument } from './LabelDocument';
import { LocationSettingsModal } from './LocationSettingsModal';
import { useVariants, useBulkCreateVariants, useDeleteVariant } from '../hooks/useVariants';
import { useCatalogData } from '../hooks/useCatalogConfig';

export default function VariantTable({ productId, productName }) {
  const { data, isLoading, isError } = useVariants(productId);
  const deleteMutation = useDeleteVariant(productId);
  const bulkCreateMutation = useBulkCreateVariants(productId);
  
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, sku }
  const [selectedVariants, setSelectedVariants] = useState([]); // array of variant ids
  const [isPrinting, setIsPrinting] = useState(false);
  const [stockBreakdownVariant, setStockBreakdownVariant] = useState(null); // stores the variant object
  const [locationSettingsVariant, setLocationSettingsVariant] = useState(null); // stores the variant object

  const { sizes: SIZES, colors: COLORS_PALETTE } = useCatalogData();

  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const variants = data?.data || [];

  const toggleSize = (size) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const toggleColor = (color) => {
    setSelectedColors(prev => prev.some(c => c.code === color.code) ? prev.filter(c => c.code !== color.code) : [...prev, color]);
  };

  const handleGenerate = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) return;
    
    const payload = [];
    selectedColors.forEach(color => {
      selectedSizes.forEach(size => {
        // e.g. SE-001-RED-S
        const skuPart = `SE-${Math.floor(Math.random() * 1000)}-${color.name.toUpperCase().substring(0,3)}-${size}`;
        payload.push({
          sku: skuPart,
          size: size,
          colorName: color.name,
          hexCode: color.value,
          quantity: 0,
          reorderLevel: 5,
          priceOverride: undefined
        });
      });
    });

    bulkCreateMutation.mutate(payload, {
      onSuccess: () => {
        setShowGenerator(false);
        setSelectedSizes([]);
        setSelectedColors([]);
      }
    });
  };

  const getStatus = (v) => {
    const qty = v.totalQuantity !== undefined ? v.totalQuantity : v.quantity;
    if (qty === 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (qty <= v.reorderLevel) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  const handleExport = () => {
    import('../utils/csvUtils').then(({ exportToCSV }) => {
      const exportData = variants.map(v => ({
        SKU: v.sku,
        Size: v.size || '-',
        Color: v.colorName || '-',
        Quantity: v.totalQuantity !== undefined ? v.totalQuantity : v.quantity,
        ReorderLevel: v.reorderLevel,
        PriceOverride: v.priceOverride || '',
        Status: getStatus(v).label
      }));
      exportToCSV(exportData, `Variants_${productId}`);
    });
  };

  const toggleVariantSelection = (id) => {
    setSelectedVariants(prev => prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]);
  };

  const toggleAllVariants = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map(v => v.id));
    }
  };

  const handlePrintLabels = async (variantsToPrint) => {
    setIsPrinting(true);
    try {
      const blob = await pdf(<LabelDocument variants={variantsToPrint} productName={productName} />).toBlob();
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link to download the PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = `Labels_${productName || 'Variants'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate labels", error);
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '32px' }}>Loading variants...</div>;

  return (
    <>
    <div className="glass-panel mobile-no-scroll" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0, gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Product Variants</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Manage sizes, colors, and stock levels.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleExport}
            disabled={!variants.length}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            Export
          </button>
          
          {selectedVariants.length > 0 ? (
            <button 
              className="btn-secondary" 
              onClick={() => handlePrintLabels(variants.filter(v => selectedVariants.includes(v.id)))}
              disabled={isPrinting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', borderColor: 'var(--text-primary)' }}
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Print Labels ({selectedVariants.length})
            </button>
          ) : (
            <button 
              className="btn-secondary" 
              onClick={() => handlePrintLabels(variants)}
              disabled={isPrinting || variants.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Print All Labels
            </button>
          )}

          <button 
            className="btn-primary" 
            onClick={() => setShowGenerator(!showGenerator)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            {showGenerator ? 'Cancel' : 'Generate Variants'}
          </button>
        </div>
      </div>

      {showGenerator && (
        <div style={{ padding: '24px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '32px', border: '1px solid var(--border-light)', flexShrink: 0 }}>
          <h4 style={{ marginBottom: '16px' }}>Generate Variant Combinations</h4>
          
          <div style={{ display: 'flex', gap: '48px', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Select Sizes</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SIZES.map(size => (
                  <button 
                    key={size}
                    onClick={() => toggleSize(size)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      background: selectedSizes.includes(size) ? 'var(--text-primary)' : 'transparent',
                      color: selectedSizes.includes(size) ? 'var(--bg-dark)' : 'var(--text-primary)',
                      border: `1px solid ${selectedSizes.includes(size) ? 'var(--text-primary)' : 'var(--border-light)'}`
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Select Colors</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS_PALETTE.map(color => (
                  <button 
                    key={color.code}
                    onClick={() => toggleColor(color)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      background: selectedColors.some(c => c.code === color.code) ? 'var(--bg-card)' : 'transparent',
                      border: `1px solid ${selectedColors.some(c => c.code === color.code) ? 'var(--accent-gold)' : 'var(--border-light)'}`
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color.value }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Will generate <strong>{selectedSizes.length * selectedColors.length}</strong> new combinations.
            </span>
            <button 
              className="btn-primary" 
              onClick={handleGenerate}
              disabled={selectedSizes.length === 0 || selectedColors.length === 0 || bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? 'Generating...' : 'Confirm Generation'}
            </button>
          </div>
        </div>
      )}

      {variants.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No variants generated yet.</p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <motion.table initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', paddingLeft: '16px' }}>
                  <input 
                    type="checkbox" 
                    checked={variants.length > 0 && selectedVariants.length === variants.length}
                    onChange={toggleAllVariants}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Identifiers (SKU / VAR)</th>
                <th>Barcode</th>
                <th>Size</th>
                <th>Color</th>
                <th>Total Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Settings & Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => {
                const status = getStatus(v);
                const isSelected = selectedVariants.includes(v.id);
                return (
                  <motion.tr variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} key={v.id} style={{ background: isSelected ? 'var(--bg-input)' : 'transparent' }}>
                    <td style={{ paddingLeft: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleVariantSelection(v.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{v.sku}</span>
                          <button onClick={() => handleCopy(v.sku, `sku-${v.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }} title="Copy SKU">
                            {copiedId === `sku-${v.id}` ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{v.variantCode}</span>
                          <button onClick={() => handleCopy(v.variantCode, `var-${v.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }} title="Copy Variant Code">
                            {copiedId === `var-${v.id}` ? <CheckCircle2 size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#fff', padding: '4px', borderRadius: '4px', display: 'inline-block' }}>
                          <Barcode value={v.barcode} format="CODE128" width={1.2} height={30} displayValue={false} margin={0} background="transparent" />
                        </div>
                        <button onClick={() => handleCopy(v.barcode, `bar-${v.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }} title="Copy Barcode Value">
                          {copiedId === `bar-${v.id}` ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{v.barcode}</div>
                    </td>
                    <td>{v.size}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {v.hexCode && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.hexCode }} />}
                        {v.colorName}
                      </div>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {v.totalQuantity !== undefined ? v.totalQuantity : v.quantity}
                        <button 
                          onClick={() => setStockBreakdownVariant(v)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                          title="View Stock Breakdown"
                        >
                          <Info size={14} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                        backgroundColor: status.bg, color: status.color 
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => handlePrintLabels([v])}
                          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                          title="Print Label"
                          disabled={isPrinting}
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => setLocationSettingsVariant(v)}
                          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                          title="Location Settings"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteTarget({ id: v.id, sku: v.sku })}
                          style={{ color: 'var(--accent-danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                          title="Delete Variant"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </motion.table>
        </div>
      )}
    </div>

    {/* Location Settings Modal */}
    {locationSettingsVariant && (
      <LocationSettingsModal 
        variant={locationSettingsVariant}
        onClose={() => setLocationSettingsVariant(null)}
        onSaveSuccess={() => {
          // If we want to refresh variant table data after saving:
          // We can let the parent query refetch, or we just close the modal.
          // Since useVariants is used, we can just invalidate it if we imported queryClient.
        }}
      />
    )}

    {/* Delete Confirmation Modal */}
    {deleteTarget && (
      <>
        <div
          onClick={() => setDeleteTarget(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 999, backdropFilter: 'blur(4px)'
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '420px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={20} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Delete Variant</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
              </div>
            </div>
            <button onClick={() => setDeleteTarget(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{
              padding: '16px',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>You are about to permanently delete:</p>
              <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '600', color: '#ef4444' }}>
                {deleteTarget.sku}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                All stock history and transaction records for this variant will also be removed.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null)
                  });
                }}
                disabled={deleteMutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff',
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                  fontWeight: '600', fontSize: '14px',
                  transition: 'opacity 0.2s'
                }}
              >
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </motion.div>
    {/* Stock Breakdown Modal */}
    {stockBreakdownVariant && (
      <>
        <div
          onClick={() => setStockBreakdownVariant(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, backdropFilter: 'blur(4px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px', zIndex: 1000, overflow: 'hidden' }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Stock Breakdown</h3>
            <button onClick={() => setStockBreakdownVariant(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Variant</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{stockBreakdownVariant.sku}</span>
            </div>
            
            <div style={{ background: 'var(--bg-input)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Location</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Qty</span>
              </div>
              
              {stockBreakdownVariant.stockByLocation?.length > 0 ? (
                stockBreakdownVariant.stockByLocation.map((loc, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < stockBreakdownVariant.stockByLocation.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{loc.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{loc.quantity}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No stock in any location
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontWeight: 600 }}>{stockBreakdownVariant.totalQuantity || 0}</span>
            </div>
          </div>
        </motion.div>
      </>
    )}
      </>
    )}
    </>
  );
}

