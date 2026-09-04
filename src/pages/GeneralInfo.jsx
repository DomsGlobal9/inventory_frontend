import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../context/ProductContext';
import { useCatalogData } from '../hooks/useCatalogConfig';
import Dropdown from '../components/Dropdown';

export default function GeneralInfo() {
  const navigate = useNavigate();
  const { productData, updateProductData } = useProduct();
  const { dressByCategory, designTypes, materials, productTypes, categories } = useCatalogData();

  const PRODUCT_TYPES_LABELS = productTypes.map(p => p.label ?? p);
  const DRESS_TYPES = dressByCategory[productData.category] || [];

  return (
    <div className="animate-fade-in mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      <div className="glass-panel mobile-col" style={{ padding: '32px', display: 'flex', gap: '48px', flex: 1 }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label className="input-label">Product Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Emerald Satin Evening Gown"
              value={productData.title}
              onChange={(e) => updateProductData('title', e.target.value)} 
            />
          </div>

          <div className="mobile-col" style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Product Category</label>
              <Dropdown 
                value={productData.category}
                placeholder="Select Category"
                options={categories}
                onChange={(val) => {
                  updateProductData('category', val);
                  updateProductData('dressType', ''); // Reset dress type
                }}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label className="input-label">Dress Type</label>
              <Dropdown 
                value={productData.dressType}
                placeholder="Select Dress Type"
                options={DRESS_TYPES}
                onChange={(val) => updateProductData('dressType', val)}
              />
            </div>
          </div>

          <div className="mobile-col" style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Design / Craft</label>
              <Dropdown 
                value={productData.craft}
                placeholder="Select Craft"
                options={designTypes}
                onChange={(val) => updateProductData('craft', val)}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label className="input-label">Material / Fabric</label>
              <Dropdown 
                value={productData.fabric}
                placeholder="Select Fabric"
                options={materials}
                onChange={(val) => updateProductData('fabric', val)}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label className="input-label">Product Description</label>
            <textarea 
              className="input-field" 
              placeholder="Describe your product..."
              value={productData.description}
              onChange={(e) => updateProductData('description', e.target.value)}
              style={{ resize: 'none', flex: 1 }}
            />
          </div>

          <div>
            <label className="input-label">Product Type</label>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
              {PRODUCT_TYPES_LABELS.map(type => (
                <button 
                  key={type}
                  onClick={() => updateProductData('productType', type)}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    background: productData.productType === type ? 'var(--text-primary)' : 'transparent', 
                    color: productData.productType === type ? 'var(--bg-dark)' : 'var(--text-secondary)', 
                    borderRadius: '2px', 
                    fontSize: '12px', 
                    fontWeight: '500' 
                  }}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="input-label">Brand / Collection</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Heritage 2024"
              value={productData.brand}
              onChange={(e) => updateProductData('brand', e.target.value)} 
            />
          </div>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="mobile-sticky-footer" style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-light)',
        flexShrink: 0
      }}>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => {
            // Step 1 used to advance unconditionally. Title and category are both required
            // by the backend's createProductSchema, so an empty name meant the user filled
            // in sizes, colours, stock and photos across two more steps before the publish
            // call came back 400 -- all of that work discarded for something knowable here.
            if (!productData.title?.trim()) {
              toast.error('Give the product a name before continuing.');
              return;
            }
            if (!productData.category) {
              toast.error('Choose a product category before continuing.');
              return;
            }
            navigate('/add/measurements');
          }}
        >
          CONTINUE
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
