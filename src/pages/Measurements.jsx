import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useCatalogData } from '../hooks/useCatalogConfig';

export default function Measurements() {
  const navigate = useNavigate();
  const { productData, updateProductData } = useProduct();
  const [activeColor, setActiveColor] = useState(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const { sizes: SIZES, colors: COLORS_PALETTE } = useCatalogData();

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
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Standard Size Chart (Inches)</h2>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '8px' }}>Size</th>
                  <th style={{ padding: '8px' }}>Bust</th>
                  <th style={{ padding: '8px' }}>Waist</th>
                  <th style={{ padding: '8px' }}>Hips</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}><td style={{ padding: '8px' }}>XS</td><td style={{ padding: '8px' }}>32"</td><td style={{ padding: '8px' }}>24"</td><td style={{ padding: '8px' }}>34"</td></tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}><td style={{ padding: '8px' }}>S</td><td style={{ padding: '8px' }}>34"</td><td style={{ padding: '8px' }}>26"</td><td style={{ padding: '8px' }}>36"</td></tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}><td style={{ padding: '8px' }}>M</td><td style={{ padding: '8px' }}>36"</td><td style={{ padding: '8px' }}>28"</td><td style={{ padding: '8px' }}>38"</td></tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}><td style={{ padding: '8px' }}>L</td><td style={{ padding: '8px' }}>38"</td><td style={{ padding: '8px' }}>30"</td><td style={{ padding: '8px' }}>40"</td></tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}><td style={{ padding: '8px' }}>XL</td><td style={{ padding: '8px' }}>40"</td><td style={{ padding: '8px' }}>32"</td><td style={{ padding: '8px' }}>42"</td></tr>
              </tbody>
            </table>
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
          <div style={{ width: '200px' }}>
            <label className="input-label">Base Price (USD)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 1250"
              value={productData.price}
              onChange={(e) => updateProductData('price', e.target.value)} 
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Available Sizes</label>
              <button 
                onClick={() => setShowSizeChart(true)}
                style={{ fontSize: '12px', color: 'var(--accent-gold)', borderBottom: '1px solid var(--accent-gold)' }}
              >
                Size chart ?
              </button>
            </div>
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
          <label className="input-label">Inventory Units Matrix <span style={{color: 'var(--accent-gold)'}}>*</span></label>
          
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
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="0"
                              value={productData.units[colorCode]?.[size] || ''}
                              onChange={(e) => handleUnitChange(size, colorCode, e.target.value)}
                              style={{ textAlign: 'center', width: '60px', padding: '6px', margin: '0 auto' }}
                            />
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-light)',
        flexShrink: 0
      }}>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => navigate('/add/upload')}
        >
          CONTINUE TO UPLOAD
          <ChevronRight size={16} />
        </button>
      </div>
      
    </div>
  );
}
