import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../context/ProductContext';
import { useCatalogData } from '../hooks/useCatalogConfig';
import { useSuppliers } from '../hooks/useSuppliers';
import Select from '../components/common/Select';

const FREE_SIZE = 'Free Size';

/**
 * What each category is measured by, and the figures for each size.
 *
 * The chart used to be one hardcoded table: XS to XL against Bust, Waist and Hips. That is a
 * women's chart, and it was shown for menswear and for childrenswear too -- so a shop adding
 * a boy's kurta was told to measure his bust, and the sizes on offer were XS to XXL when
 * children's clothes are sold by age.
 *
 * Inches, and Indian ready-to-wear conventions. These are a starting point, not a standard:
 * every shop cuts differently, which is why the sizes themselves live in the client's own
 * catalogue (Settings -> Catalog Configuration) where they can be renamed, removed or added
 * to per category.
 */
const SIZE_CHARTS = {
  WOMEN: {
    title: "Women's Size Chart",
    columns: ['Size', 'Bust', 'Waist', 'Hips'],
    rows: [
      ['XS', '32"', '24"', '34"'],
      ['S', '34"', '26"', '36"'],
      ['M', '36"', '28"', '38"'],
      ['L', '38"', '30"', '40"'],
      ['XL', '40"', '32"', '42"'],
      ['XXL', '42"', '34"', '44"']
    ]
  },
  MEN: {
    title: "Men's Size Chart",
    columns: ['Size', 'Chest', 'Waist', 'Shoulder'],
    rows: [
      ['S', '36"', '30"', '16.5"'],
      ['M', '38"', '32"', '17"'],
      ['L', '40"', '34"', '17.5"'],
      ['XL', '42"', '36"', '18"'],
      ['XXL', '44"', '38"', '18.5"'],
      ['3XL', '46"', '40"', '19"']
    ]
  },
  KIDS: {
    title: "Kids' Size Chart",
    // Age first, because that is what a parent buys by. Height and chest are how you check.
    columns: ['Age', 'Height', 'Chest'],
    rows: [
      ['0-6M', '24"', '18"'],
      ['6-12M', '28"', '19"'],
      ['1-2Y', '33"', '20"'],
      ['2-3Y', '37"', '21"'],
      ['3-4Y', '40"', '22"'],
      ['4-5Y', '43"', '23"'],
      ['5-6Y', '45"', '24"'],
      ['6-7Y', '47"', '25"'],
      ['7-8Y', '50"', '26"'],
      ['8-10Y', '54"', '28"'],
      ['10-12Y', '58"', '30"'],
      ['12-14Y', '62"', '32"']
    ]
  }
};

export default function Measurements() {
  const navigate = useNavigate();
  const { productData, updateProductData } = useProduct();
  const [activeColor, setActiveColor] = useState(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const { sizesFor, colors: COLORS_PALETTE } = useCatalogData();

  // Which chart and which sizes this product should be offered, from the category chosen on
  // the previous step. Falls back to women's, which is what this catalogue was built around.
  const category = (productData.category || 'WOMEN').toUpperCase();
  const SIZES = sizesFor(category);
  const sizeChart = SIZE_CHARTS[category] || SIZE_CHARTS.WOMEN;
  const { data: suppliers = [] } = useSuppliers();

  // Sarees drape rather than fit to a size chart -- they're sold as one size.
  // Force the selection to Free Size while this product is a saree, and clear it
  // back out if the user backs up and switches to a sized dress type.
  const isSaree = productData.dressType?.toLowerCase() === 'saree';
  useEffect(() => {
    if (isSaree && productData.selectedSizes.join() !== FREE_SIZE) {
      updateProductData('selectedSizes', [FREE_SIZE]);
    } else if (!isSaree && productData.selectedSizes.join() === FREE_SIZE) {
      updateProductData('selectedSizes', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaree]);

  /**
   * Drop any chosen size that the current category does not offer.
   *
   * Without this, picking L and XL for a women's kurta and then going back and switching the
   * product to Kids left L and XL selected -- sizes that are not on the kids chart, that the
   * shopper cannot see to unpick, and that would have gone through to the variant matrix and
   * been created as real stock-keeping units.
   *
   * Free Size is left alone: the saree rule below owns it, and it is valid for any category.
   */
  useEffect(() => {
    if (isSaree) return;
    const allowed = new Set([...SIZES, FREE_SIZE]);
    const kept = productData.selectedSizes.filter(sz => allowed.has(sz));
    if (kept.length !== productData.selectedSizes.length) {
      updateProductData('selectedSizes', kept);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, SIZES.join('|')]);

  // Handlers for Sizes
  const toggleSize = (size) => {
    const current = productData.selectedSizes;
    const updated = current.includes(size)
      ? current.filter(s => s !== size)
      : [...current, size];
    updateProductData('selectedSizes', updated);
  };
  
  // Handlers for Colors
  const toggleBaseColor = (color) => {
    const current = productData.selectedColors;
    const updated = current.includes(color.code)
      ? current.filter(c => c !== color.code)
      : [...current, color.code];
    updateProductData('selectedColors', updated);
  };

  const toggleShade = (shade, colorName) => {
    const shadeCode = `${colorName.toLowerCase()}_${shade}`;
    const current = productData.selectedColors;
    const updated = current.includes(shadeCode)
      ? current.filter(c => c !== shadeCode)
      : [...current, shadeCode];
    updateProductData('selectedColors', updated);
  };

  const removeColor = (colorCode) => {
    const updated = productData.selectedColors.filter(c => c !== colorCode);
    updateProductData('selectedColors', updated);
  };

  const isColorSelected = (code) => productData.selectedColors.includes(code);

  const getColorInfo = (code) => {
    const baseColor = COLORS_PALETTE.find(c => c.code === code);
    if (baseColor) return { name: baseColor.name, value: baseColor.value };
    
    if (code.includes('_')) {
      const [name, hex] = code.split('_');
      return { name: `${name.charAt(0).toUpperCase() + name.slice(1)} Shade`, value: hex };
    }
    return { name: code, value: '#808080' };
  };

  // Handlers for Units
  const handleUnitChange = (size, colorCode, value) => {
    if (value === '' || /^[0-9]*$/.test(value)) {
      const currentUnits = productData.units;
      const updated = {
        ...currentUnits,
        [colorCode]: {
          ...(currentUnits[colorCode] || {}),
          [size]: value
        }
      };
      updateProductData('units', updated);
    }
  };

  // Per-variant price. Decimals allowed, unlike units -- a saree can cost 1250.50, it
  // cannot be half a saree.
  const handleVariantPriceChange = (size, colorCode, value) => {
    if (value !== '' && !/^[0-9]*[.]?[0-9]*$/.test(value)) return;
    const current = productData.variantPrices || {};
    updateProductData('variantPrices', {
      ...current,
      [colorCode]: { ...(current[colorCode] || {}), [size]: value }
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
      
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', flexShrink: 0 }}>
        <button 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', paddingLeft: 0 }}
          onClick={() => navigate('/add/general')}
        >
          <ArrowLeft size={16} />
          BACK
        </button>
      </div>
      
      {/* Size Chart Modal */}
      {showSizeChart && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ width: '600px', padding: '32px', backgroundColor: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{sizeChart.title} (Inches)</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '16px' }}>
              A starting point, not a standard. Your own sizes live in Settings under Catalog
              Configuration, where you can rename them or add your own per category.
            </p>
            <div style={{ maxHeight: '46vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {sizeChart.columns.map(col => (
                      <th key={col} style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeChart.rows.map(row => (
                    <tr key={row[0]} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {row.map((cell, i) => (
                        <td key={i} style={{ padding: '8px' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-primary" onClick={() => setShowSizeChart(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* ROW 1: Price and Sizes */}
        <div className="mobile-col" style={{ display: 'flex', gap: '32px' }}>
          <div style={{ width: '170px' }}>
            <label className="input-label">You sell at (₹)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 1250"
              value={productData.price}
              onChange={(e) => updateProductData('price', e.target.value)} 
            />
          </div>

          {/* Asked for here because not asking is what produced stock the system believed was
              free. A shop holding 50 sarees at no cost that received one more at 4,999 had the
              saree valued at 98 rupees -- the 4,999 was averaged across 51 pieces, 50 of which
              were recorded as costing nothing. Optional, and the hint says what it is for
              rather than nagging. */}
          <div style={{ width: '170px' }}>
            <label className="input-label">You pay (₹)</label>
            <input
              type="number"
              className="input-field"
              placeholder="what you paid"
              value={productData.costPrice}
              onChange={(e) => updateProductData('costPrice', e.target.value)}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {Number(productData.costPrice) > 0 && Number(productData.price) > 0
                ? `you keep ${(((Number(productData.price) - Number(productData.costPrice)) / Number(productData.price)) * 100).toFixed(0)}% of what you sell it for`
                : 'Optional — used for profit and stock value'}
            </div>
          </div>

          {/* The supplier link was created only when a purchase order was raised, so every
              supplier's item list stayed empty until you had already ordered from them, and
              reordering could not suggest who to buy from. */}
          <div style={{ width: '200px' }}>
            <label className="input-label">Supplier</label>
            {/* This Select builds its list from <option> CHILDREN and hands onChange a mock
                event, not a bare value -- passing it an options array rendered an empty
                dropdown that still looked correct on the page. */}
            <Select
              value={productData.supplierId}
              onChange={(e) => updateProductData('supplierId', e.target.value)}
            >
              <option value="">Not from a supplier</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </Select>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Optional — lets you reorder without retyping
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Available Sizes</label>
              {!isSaree && (
                <button
                  onClick={() => setShowSizeChart(true)}
                  style={{ fontSize: '12px', color: 'var(--accent-gold)', borderBottom: '1px solid var(--accent-gold)' }}
                >
                  Size chart ?
                </button>
              )}
            </div>
            {isSaree ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <div style={{
                  padding: '10px 20px',
                  border: '1px solid var(--text-primary)',
                  borderRadius: '4px',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-dark)',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  {FREE_SIZE}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sarees are sold as one size</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {SIZES.map(size => {
                  const selected = productData.selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      style={{
                        width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${selected ? 'var(--text-primary)' : 'var(--border-light)'}`,
                        borderRadius: '4px',
                        background: selected ? 'var(--text-primary)' : 'transparent',
                        color: selected ? 'var(--bg-dark)' : 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Compact Colors */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <label className="input-label" style={{ margin: 0 }}>Select Colors</label>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click to view shades • Double-click to select base color</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
            {/* Color Swatches */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '300px' }}>
              {COLORS_PALETTE.map(color => (
                <button
                  key={color.code}
                  onClick={() => setActiveColor(color)}
                  onDoubleClick={() => toggleBaseColor(color)}
                  title={color.name}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: color.value,
                    border: `2px solid ${activeColor?.code === color.code ? 'var(--text-primary)' : isColorSelected(color.code) ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                    boxShadow: isColorSelected(color.code) ? '0 0 0 2px var(--accent-gold)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>

            {/* Inline Shades Drawer */}
            {activeColor && (
              <div className="animate-fade-in" style={{ padding: '8px 16px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{activeColor.name} Shades:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeColor.shades.map((shade, idx) => {
                    const shadeCode = `${activeColor.name.toLowerCase()}_${shade}`;
                    const selected = isColorSelected(shadeCode);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleShade(shade, activeColor.name)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '4px',
                          backgroundColor: shade,
                          border: `2px solid ${selected ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Color Chips */}
          {productData.selectedColors.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              {productData.selectedColors.map(code => {
                const info = getColorInfo(code);
                return (
                  <div key={code} className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: info.value, border: '1px solid var(--border-light)' }} />
                    <span style={{ fontSize: '12px' }}>{info.name}</span>
                    <button onClick={() => removeColor(code)} style={{ color: 'var(--text-secondary)', marginLeft: '4px', cursor: 'pointer' }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ROW 3: Inventory Matrix Table */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <label className="input-label" style={{ marginBottom: 0 }}>
              Inventory Units Matrix <span style={{color: 'var(--accent-gold)'}}>*</span>
            </label>
            {/* Off by default. Most shops sell every size of one saree at one price, and a grid
                of price boxes nobody needs is a grid of boxes somebody mistypes. But when it is
                real -- a plus size, a heavier zari border -- there was no way to say so, and
                the only alternative was editing every variant afterwards, one at a time. */}
            {productData.selectedSizes.length > 0 && productData.selectedColors.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!productData.perVariantPricing}
                  onChange={(e) => updateProductData('perVariantPricing', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Different price per size or colour
              </label>
            )}
          </div>
          
          {(productData.selectedSizes.length === 0 || productData.selectedColors.length === 0) ? (
            <div style={{ padding: '32px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select at least one Size and Color to input stock units.</span>
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '6px', backgroundColor: 'var(--bg-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '500px' }}>
                <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '12px', borderBottom: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', width: '200px', minWidth: '200px', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      Variant
                    </th>
                    {productData.selectedSizes.map(size => (
                      <th key={size} style={{ padding: '12px', borderBottom: '1px solid var(--border-light)', minWidth: '80px', fontSize: '13px', fontWeight: '600' }}>
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productData.selectedColors.map(colorCode => {
                    const info = getColorInfo(colorCode);
                    return (
                      <tr key={colorCode} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '12px', borderRight: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: info.value, border: '1px solid var(--border-light)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>{info.name}</span>
                        </td>
                        {productData.selectedSizes.map(size => (
                          <td key={size} style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="0"
                                title="How many pieces"
                                value={productData.units[colorCode]?.[size] || ''}
                                onChange={(e) => handleUnitChange(size, colorCode, e.target.value)}
                                style={{ textAlign: 'center', width: '70px', padding: '6px', margin: '0 auto' }}
                              />
                              {productData.perVariantPricing && (
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder={productData.price ? `₹${productData.price}` : '₹ price'}
                                  title="What this exact size and colour sells for. Leave blank to use the base price."
                                  value={productData.variantPrices?.[colorCode]?.[size] || ''}
                                  onChange={(e) => handleVariantPriceChange(size, colorCode, e.target.value)}
                                  style={{ textAlign: 'center', width: '70px', padding: '4px', margin: '0 auto', fontSize: '12px' }}
                                />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
      
      {/* Footer Actions */}
      <div className="mobile-sticky-footer" style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-light)',
        flexShrink: 0
      }}>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => {
            // Same gap as step 1: this advanced with no sizes, no colours and an empty
            // stock matrix, despite the matrix being labelled required. Publishing is
            // blocked at the preview either way, so the only thing the silence bought was
            // a wasted trip through the photo step.
            if (!productData.selectedSizes?.length) {
              toast.error('Select at least one size before continuing.');
              return;
            }
            if (!productData.selectedColors?.length) {
              toast.error('Select at least one colour before continuing.');
              return;
            }
            if (!(Number(productData.price) > 0)) {
              toast.error('Set a base price before continuing.');
              return;
            }
            navigate('/add/upload');
          }}
        >
          CONTINUE TO UPLOAD
          <ChevronRight size={16} />
        </button>
      </div>
      
    </div>
  );
}
