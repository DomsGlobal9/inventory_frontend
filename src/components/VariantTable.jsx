import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Download, AlertTriangle, X, Copy, CheckCircle2, Printer, Info, Settings, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Barcode from 'react-barcode';
import { pdf } from '@react-pdf/renderer';
import { LabelDocument } from './LabelDocument';
import { LocationSettingsModal } from './LocationSettingsModal';
import { useVariants, useBulkCreateVariants, useDeleteVariant, useUpdateVariant } from '../hooks/useVariants';
import { useCatalogData } from '../hooks/useCatalogConfig';
import { useLocationContext } from '../contexts/LocationContext';
import { useAuth } from '../context/AuthContext';

export default function VariantTable({ productId, productName, highlightVariantId }) {
  // Stamped into the barcode-label PDF metadata; must be the real tenant.
  const { clientId } = useAuth();
  const { data, isLoading, isError } = useVariants(productId);
  const deleteMutation = useDeleteVariant(productId);
  const bulkCreateMutation = useBulkCreateVariants(productId);
  const updateVariantMutation = useUpdateVariant(productId);
  const { currentLocation } = useLocationContext();

  // Scroll the scanned variant into view once the table has rendered it.
  const scannedRowRef = useRef(null);
  useEffect(() => {
    if (highlightVariantId && scannedRowRef.current) {
      scannedRowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightVariantId, data]);

  const [priceDrafts, setPriceDrafts] = useState({}); // { [variantId]: string } -- unconfirmed edits only
  const [costDrafts, setCostDrafts] = useState({}); // same, for the cost column
  const [profitInputs, setProfitInputs] = useState({}); // markup % -- a calculator, never stored
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]); // [{code, name, value}]
  const [activeShadeColor, setActiveShadeColor] = useState(null); // base color whose shades are open
  const [units, setUnits] = useState({}); // { colorCode: { size: qty } }
  const [applyToAllLocations, setApplyToAllLocations] = useState(false);
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

  const toggleShade = (shade, baseColor) => {
    // Every shade of a color used to get the identical label "<Color> Shade" --
    // indistinguishable once more than one shade of the same base color was picked
    // (chips/matrix rows all read "Red Shade" with no way to tell them apart). Number
    // them by position within that color's shade list instead.
    const shadeIndex = (baseColor.shades || []).indexOf(shade);
    const shadeColor = {
      code: `${baseColor.name.toLowerCase()}_${shade}`,
      name: `${baseColor.name} Shade ${shadeIndex + 1}`,
      value: shade
    };
    toggleColor(shadeColor);
  };

  const resetGenerator = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setUnits({});
    setActiveShadeColor(null);
    setApplyToAllLocations(false);
  };

  const handleUnitChange = (colorCode, size, value) => {
    if (value !== '' && !/^[0-9]*$/.test(value)) return;
    setUnits(prev => ({ ...prev, [colorCode]: { ...(prev[colorCode] || {}), [size]: value } }));
  };

  const handleGenerate = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) return;

    const payload = [];
    selectedColors.forEach(color => {
      selectedSizes.forEach(size => {
        // e.g. SE-001-RED-S
        const skuPart = `SE-${Math.floor(Math.random() * 1000)}-${color.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0,3)}-${size}`;
        const quantity = parseInt(units[color.code]?.[size] || '0', 10);
        payload.push({
          sku: skuPart,
          size: size,
          colorName: color.name,
          hexCode: color.value,
          quantity,
          reorderLevel: 5,
          priceOverride: undefined
        });
      });
    });

    bulkCreateMutation.mutate({ variants: payload, applyToAllLocations }, {
      onSuccess: () => {
        setShowGenerator(false);
        resetGenerator();
      }
    });
  };

  const getStatus = (v) => {
    const qty = v.totalQuantity !== undefined ? v.totalQuantity : v.quantity;
    if (qty === 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (qty <= v.reorderLevel) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
  };

  // Margin is Selling Price vs Average Cost (the live weighted-average from actual
  // purchase receipts), not Cost Price -- Average Cost reflects what stock on hand
  // really cost, Cost Price is just a manually-typed reference figure. A variant with
  // no purchase history yet has averageCost = 0, which would show a fake 100% margin,
  // so that case is reported separately as "no cost data" instead.
  // Previews against the unconfirmed draft price when one is being typed, so the merchant
  // sees what a price WOULD do to their margin before committing it.
  // What the CURRENTLY SELECTED location does with this variant. The rest of this page
  // (stock figures, the location switcher in the top nav) is already location-scoped, but
  // the price columns were not: they showed the global sellingPrice and computed margin
  // against it, even when the selected location charges something else or doesn't sell the
  // item at all. Orders and barcode labels both honour the override, so the pricing screen
  // was the only surface still quoting a number the shop doesn't actually charge.
  const locationSettingFor = (v) => {
    const list = v.locationSettings || v.locationProfiles || [];
    return currentLocation?.id ? list.find(s => s.locationId === currentLocation.id) : undefined;
  };

  const locationPriceOf = (v) => {
    const setting = locationSettingFor(v);
    const override = setting?.priceOverride;
    return override === null || override === undefined || override === '' ? null : Number(override);
  };

  // Price this variant actually sells for at the selected location, mirroring the backend's
  // resolveVariantForLocation precedence: override -> variant sellingPrice.
  const effectivePriceOf = (v) => {
    const draft = priceDrafts[v.id];
    if (draft !== undefined) return Number(draft); // previewing an unconfirmed edit
    const override = locationPriceOf(v);
    if (override !== null) return override;
    return v.sellingPrice ? Number(v.sellingPrice) : null;
  };

  const getMarginInfo = (v) => {
    const effectivePrice = effectivePriceOf(v);
    const sellingPrice = Number.isFinite(effectivePrice) && effectivePrice > 0 ? effectivePrice : null;
    const avgCost = Number(v.averageCost || 0);
    if (!sellingPrice) return { label: 'Set a price', color: 'var(--text-muted)', pct: null };
    if (avgCost <= 0) return { label: 'No cost data yet', color: 'var(--text-muted)', pct: null };

    const pct = ((sellingPrice - avgCost) / sellingPrice) * 100;
    const color = pct >= 30 ? '#10b981' : pct >= 15 ? '#f59e0b' : '#ef4444';
    return { label: `${pct.toFixed(1)}%`, color, pct };
  };

  // What a markup is calculated against. Real money actually paid (averageCost, blended
  // from receipts) wins whenever it exists; the manually-typed costPrice is the fallback
  // for items not purchased through the system yet. Which one was used is shown in the UI
  // so a price is never derived from a number the merchant can't see.
  const effectiveCostOf = (v) => {
    const avg = Number(v.averageCost || 0);
    if (avg > 0) return { value: avg, source: 'received stock' };
    const manual = v.costPrice ? Number(v.costPrice) : 0;
    if (manual > 0) return { value: manual, source: 'your cost' };
    return { value: 0, source: null };
  };

  // Type a profit % -> fills the selling price as cost + that % OF COST (markup), the way
  // a shop owner means "I buy at 350, I add 40%, I sell at 490". Note this is markup, not
  // accounting margin: the same 40% expressed as margin-on-price would be ₹583, which is
  // why the resulting true margin is always displayed next to it.
  const applyProfitPercent = (variant, rawPct) => {
    setProfitInputs(prev => ({ ...prev, [variant.id]: rawPct }));
    const pct = Number(rawPct);
    const cost = effectiveCostOf(variant).value;
    if (rawPct === '' || !Number.isFinite(pct) || pct < 0 || cost <= 0) return;
    const price = cost * (1 + pct / 100);
    setPriceDrafts(prev => ({ ...prev, [variant.id]: price.toFixed(2) }));
  };

  // A price is money -- it must never change from a stray click, a scroll over the field,
  // or tabbing away. So edits stay local until explicitly confirmed (Enter, or the tick
  // button); Escape or clicking away discards them. `priceDrafts` holds only the rows
  // currently being edited, keyed by variant id.
  const savedPriceOf = (variant) => (variant.sellingPrice ? String(Number(variant.sellingPrice)) : '');

  const savedCostOf = (variant) => (variant.costPrice ? String(Number(variant.costPrice)) : '');

  const isCostDirty = (variant) =>
    costDrafts[variant.id] !== undefined && costDrafts[variant.id] !== savedCostOf(variant);

  const discardCostDraft = (variantId) => {
    setCostDrafts(prev => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const commitCostPrice = (variant) => {
    const draft = costDrafts[variant.id];
    if (draft === undefined) return;
    const value = draft.trim();

    if (value === savedCostOf(variant)) { discardCostDraft(variant.id); return; }
    if (value === '') {
      updateVariantMutation.mutate({ id: variant.id, data: { costPrice: null } });
      discardCostDraft(variant.id);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) { discardCostDraft(variant.id); return; }
    updateVariantMutation.mutate({ id: variant.id, data: { costPrice: parsed } });
    discardCostDraft(variant.id);
  };

  const isPriceDirty = (variant) =>
    priceDrafts[variant.id] !== undefined && priceDrafts[variant.id] !== savedPriceOf(variant);

  const discardPriceDraft = (variantId) => {
    setPriceDrafts(prev => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  const commitSellingPrice = (variant) => {
    const draft = priceDrafts[variant.id];
    if (draft === undefined) return;
    const value = draft.trim();

    if (value === savedPriceOf(variant)) {
      discardPriceDraft(variant.id);
      return;
    }

    if (value === '') {
      // Clearing is a real, supported action -- it removes this variant's price override
      // so the product's base price applies again.
      updateVariantMutation.mutate({ id: variant.id, data: { sellingPrice: null } });
      discardPriceDraft(variant.id);
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      discardPriceDraft(variant.id); // invalid -- drop the edit, keep the saved price
      return;
    }
    updateVariantMutation.mutate({ id: variant.id, data: { sellingPrice: parsed } });
    discardPriceDraft(variant.id);
  };

  const handleExport = () => {
    import('../utils/csvUtils').then(({ exportToCSV }) => {
      const exportData = variants.map(v => ({
        SKU: v.sku,
        Size: v.size || '-',
        Color: v.colorName || '-',
        Quantity: v.totalQuantity !== undefined ? v.totalQuantity : v.quantity,
        ReorderLevel: v.reorderLevel,
        Cost: effectiveCostOf(v).value || '',
        SellingPrice: v.sellingPrice ?? '',
        // `v.priceOverride` never existed on a variant -- overrides live on the location
        // profile -- so this column exported blank for every row, every time.
        LocationPriceOverride: locationPriceOf(v) ?? '',
        LocationName: currentLocation?.name || '',
        Margin: getMarginInfo(v).label,
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
      const blob = await pdf(
        <LabelDocument
          variants={variantsToPrint}
          productName={productName}
          clientId={clientId}
          // Labels are physically applied at a location, so they must carry that
          // location's price when it overrides the variant's own.
          locationId={currentLocation?.id}
        />
      ).toBlob();
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
      // Previously the whole failure was swallowed: the button just stopped spinning and
      // no file appeared, with nothing telling the user why.
      toast.error(error?.message || 'Could not generate the labels.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '32px' }}>Loading variants...</div>;

  return (
    <>
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0, gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Product Variants</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Manage sizes, colors, and stock levels.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-secondary"
            onClick={handleExport}
            disabled={!variants.length || showGenerator}
            title={showGenerator ? 'Finish or cancel generating variants first' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            Export
          </button>

          {selectedVariants.length > 0 ? (
            <button
              className="btn-secondary"
              onClick={() => handlePrintLabels(variants.filter(v => selectedVariants.includes(v.id)))}
              disabled={isPrinting || showGenerator}
              title={showGenerator ? 'Finish or cancel generating variants first' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', borderColor: 'var(--text-primary)' }}
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Print Labels ({selectedVariants.length})
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => handlePrintLabels(variants)}
              disabled={isPrinting || variants.length === 0 || showGenerator}
              title={showGenerator ? 'Finish or cancel generating variants first' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
              Print All Labels
            </button>
          )}

          <button
            className="btn-primary"
            onClick={() => {
              if (showGenerator) resetGenerator();
              setShowGenerator(!showGenerator);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            {showGenerator ? 'Cancel' : 'Generate Variants'}
          </button>
        </div>
      </div>

      {showGenerator && (
        <div style={{ padding: '28px', background: 'var(--bg-input)', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--accent-gold)', borderLeft: '4px solid var(--accent-gold)', flexShrink: 0 }}>
          <h4 style={{ marginBottom: '20px' }}>Generate Variant Combinations</h4>

          <div className="mobile-col" style={{ display: 'flex', gap: '48px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>1. Select Sizes</p>
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

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>2. Select Colors</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click for shades • Double-click for base color</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS_PALETTE.map(color => (
                  <button
                    key={color.code}
                    onClick={() => setActiveShadeColor(color)}
                    onDoubleClick={() => toggleColor(color)}
                    title={color.name}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: color.value,
                      border: `2px solid ${activeShadeColor?.code === color.code ? 'var(--text-primary)' : selectedColors.some(c => c.code === color.code) ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                      boxShadow: selectedColors.some(c => c.code === color.code) ? '0 0 0 2px var(--accent-gold)' : 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Full-width so a long shade list or many selected colors can never overflow
              the narrower half-column above. */}
          {activeShadeColor && (
            <div style={{ marginBottom: '16px', padding: '10px 16px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0 }}>{activeShadeColor.name} Shades:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(activeShadeColor.shades || []).map((shade, idx) => {
                  const shadeCode = `${activeShadeColor.name.toLowerCase()}_${shade}`;
                  const selected = selectedColors.some(c => c.code === shadeCode);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleShade(shade, activeShadeColor)}
                      title={`${activeShadeColor.name} Shade ${idx + 1}`}
                      style={{
                        width: '24px', height: '24px', borderRadius: '4px',
                        backgroundColor: shade,
                        border: `2px solid ${selected ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {selectedColors.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
              {selectedColors.map(color => (
                <div key={color.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color.value, border: '1px solid var(--border-light)' }} />
                  <span style={{ fontSize: '12px' }}>{color.name}</span>
                  <button onClick={() => toggleColor(color)} style={{ color: 'var(--text-secondary)', marginLeft: '2px', cursor: 'pointer', background: 'transparent', border: 'none' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {selectedSizes.length > 0 && selectedColors.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>3. Initial Stock Quantity (optional -- defaults to 0)</p>
              <div className="table-container" style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '400px' }}>
                  <thead style={{ background: 'var(--bg-input)' }}>
                    <tr>
                      <th style={{ padding: '10px', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)' }}>Variant</th>
                      {selectedSizes.map(size => (
                        <th key={size} style={{ padding: '10px', borderBottom: '1px solid var(--border-light)', fontSize: '13px', fontWeight: 600 }}>{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedColors.map(color => (
                      <tr key={color.code} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px', borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: color.value, border: '1px solid var(--border-light)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px' }}>{color.name}</span>
                        </td>
                        {selectedSizes.map(size => (
                          <td key={size} style={{ padding: '6px' }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="0"
                              value={units[color.code]?.[size] || ''}
                              onChange={(e) => handleUnitChange(color.code, size, e.target.value)}
                              style={{ textAlign: 'center', width: '56px', padding: '6px', margin: '0 auto' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Will generate <strong>{selectedSizes.length * selectedColors.length}</strong> new combinations.
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={applyToAllLocations} onChange={(e) => setApplyToAllLocations(e.target.checked)} />
                {applyToAllLocations ? 'Stock at every location' : `Stock at ${currentLocation?.name || 'selected location'} only`}
              </label>
            </div>
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

      {showGenerator ? (
        variants.length > 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
            {variants.length} existing variant{variants.length === 1 ? '' : 's'} hidden while generating -- cancel or confirm to see them again.
          </p>
        )
      ) : variants.length === 0 ? (
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
                <th>Cost</th>
                <th>Profit %</th>
                <th>Selling Price</th>
                <th>Margin %</th>
                <th style={{ textAlign: 'right' }}>Settings & Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => {
                const status = getStatus(v);
                const isSelected = selectedVariants.includes(v.id);
                // The row a barcode scan landed on -- tinted and scrolled into view so the
                // scanned size/colour is obvious among its siblings.
                const isScanned = !!highlightVariantId && v.id === highlightVariantId;
                return (
                  <motion.tr
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    key={v.id}
                    ref={isScanned ? scannedRowRef : undefined}
                    style={{
                      background: isScanned ? 'rgba(245, 158, 11, 0.14)' : (isSelected ? 'var(--bg-input)' : 'transparent'),
                      boxShadow: isScanned ? 'inset 3px 0 0 #f59e0b' : undefined
                    }}
                  >
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
                    <td>
                      {(() => {
                        const cost = effectiveCostOf(v);
                        const costDirty = isCostDirty(v);
                        const shownCost = costDrafts[v.id] !== undefined ? costDrafts[v.id] : savedCostOf(v);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>₹</span>
                              <input
                                type="number"
                                className="input-field"
                                value={shownCost}
                                placeholder="—"
                                min="0"
                                step="0.01"
                                onChange={(e) => setCostDrafts(prev => ({ ...prev, [v.id]: e.target.value }))}
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitCostPrice(v); e.target.blur(); }
                                  if (e.key === 'Escape') { discardCostDraft(v.id); e.target.blur(); }
                                }}
                                onBlur={() => { if (!costDirty) discardCostDraft(v.id); }}
                                style={{ width: '80px', padding: '6px 8px', fontSize: '13px', borderColor: costDirty ? 'var(--accent-gold)' : undefined }}
                                title="What you pay for this item. Only needed if you haven't received it through a Purchase Order yet. Enter to save, Esc to cancel."
                              />
                              {costDirty && (
                                <>
                                  <button onClick={() => commitCostPrice(v)} title="Save cost (Enter)" style={{ display: 'flex', padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}>
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => discardCostDraft(v.id)} title="Cancel (Esc)" style={{ display: 'flex', padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                            {cost.value > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                using ₹{cost.value.toFixed(2)} ({cost.source})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const cost = effectiveCostOf(v);
                        const pctValue = profitInputs[v.id] ?? '';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input
                                type="number"
                                className="input-field"
                                value={pctValue}
                                placeholder="—"
                                min="0"
                                step="1"
                                disabled={cost.value <= 0}
                                onChange={(e) => applyProfitPercent(v, e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                style={{ width: '64px', padding: '6px 8px', fontSize: '13px' }}
                                title={cost.value > 0
                                  ? 'Profit added on top of cost. Type 40 to sell at cost + 40%. Fills the Selling Price -- still needs confirming.'
                                  : 'Enter a cost first (or receive stock through a Purchase Order) so profit can be calculated on it.'}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>%</span>
                            </div>
                            {cost.value <= 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>need a cost</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const dirty = isPriceDirty(v);
                        const shownValue = priceDrafts[v.id] !== undefined ? priceDrafts[v.id] : savedPriceOf(v);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>₹</span>
                            <input
                              type="number"
                              className="input-field"
                              value={shownValue}
                              placeholder="—"
                              min="0"
                              step="0.01"
                              onChange={(e) => setPriceDrafts(prev => ({ ...prev, [v.id]: e.target.value }))}
                              // A focused number input changes value on scroll in most
                              // browsers -- an easy way to silently alter a price just by
                              // scrolling the page. Drop focus instead of changing it.
                              onWheel={(e) => e.target.blur()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commitSellingPrice(v); e.target.blur(); }
                                if (e.key === 'Escape') { discardPriceDraft(v.id); e.target.blur(); }
                              }}
                              // Deliberately NOT saving on blur -- clicking away is not
                              // consent to change a price. An unconfirmed edit is dropped.
                              onBlur={() => { if (!dirty) discardPriceDraft(v.id); }}
                              style={{
                                width: '90px', padding: '6px 8px', fontSize: '13px',
                                borderColor: dirty ? 'var(--accent-gold)' : undefined
                              }}
                              title="What this exact size/color sells for everywhere, unless a location overrides it. Press Enter to save, Esc to cancel. Leave blank to use the product's normal price."
                            />
                            {dirty && (
                              <>
                                <button
                                  onClick={() => commitSellingPrice(v)}
                                  title="Save price (Enter)"
                                  style={{ display: 'flex', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  onClick={() => discardPriceDraft(v.id)}
                                  title="Cancel (Esc)"
                                  style={{ display: 'flex', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        // Without these two lines the box above silently contradicts what the
                        // selected location actually does -- you would set a price here and the
                        // shop would keep charging its override, or not sell the item at all.
                        const override = locationPriceOf(v);
                        const setting = locationSettingFor(v);
                        const unavailable = setting && setting.isAvailable === false;
                        if (override === null && !unavailable) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                            {override !== null && (
                              <span style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
                                {currentLocation?.name || 'This location'} sells at ₹{override.toFixed(2)}
                              </span>
                            )}
                            {unavailable && (
                              <span style={{ fontSize: '10px', color: 'var(--accent-danger, #ef4444)' }}>
                                Not sold at {currentLocation?.name || 'this location'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const margin = getMarginInfo(v);
                        return (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: margin.color }}>
                            {margin.label}
                          </span>
                        );
                      })()}
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
            backgroundColor: 'var(--bg-card)',
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
      </>
    )}

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
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', zIndex: 1000, overflow: 'hidden' }}
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
  );
}

