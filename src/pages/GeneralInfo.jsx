import React from 'react';
import TickWarning from '../components/common/TickWarning';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../context/ProductContext';
import { useCatalogData } from '../hooks/useCatalogConfig';
import Dropdown from '../components/Dropdown';
import { useSameNameProducts } from '../hooks/useProducts';
import { useBranding } from '../hooks/useBranding';
import Select from '../components/common/Select';
import WhatAreYouAdding, { whatOf, asksWhat } from '../components/products/WhatAreYouAdding';
import { useFabrics } from '../hooks/useFabrics';

/** Basis points, the same list the edit screen offers. 500 = 5%. */
const GST_RATES = [
  { label: 'Not set', value: '' },
  { label: 'Exempt (0%)', value: '0' },
  { label: '5%', value: '500' },
  { label: '12%', value: '1200' },
  { label: '18%', value: '1800' },
  { label: '28%', value: '2800' }
];

export default function GeneralInfo() {
  const navigate = useNavigate();
  const { productData, updateProductData } = useProduct();
  const { dressByCategory, designTypes, materials, productTypes, categories } = useCatalogData();
  const { data: branding } = useBranding();

  const PRODUCT_TYPES_LABELS = productTypes.map(p => p.label ?? p);
  const unstitchedLabel = PRODUCT_TYPES_LABELS.find(t => /unstitched/i.test(t)) ?? null;
  const DRESS_TYPES = dressByCategory[productData.category] || [];
  const sameName = useSameNameProducts(productData.title, productData.id);

  // Garment or fabric (16 Nov): asked first, by a pop-up, in a shop that sells both; the fields below fit the answer.
  const { data: fabrics } = useFabrics();
  const selling = productData.selling ?? { soldBy: 'PIECE' };
  const what = whatOf(selling, fabrics);
  const isFabric = what === 'FABRIC';
  // Fabric is not a garment: no dress type, no stitching choice, no clothing tax slab, not a service.
  React.useEffect(() => {
    if (!isFabric) return;
    if (productData.dressType) updateProductData('dressType', '');
    if (productData.taxSlabbed) updateProductData('taxSlabbed', false);
    if (productData.isService) updateProductData('isService', false);
    if (unstitchedLabel && productData.productType !== unstitchedLabel) updateProductData('productType', unstitchedLabel);
  }, [isFabric]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * A saree is fabric, so it is unstitched unless somebody says otherwise.
   *
   * Matched exactly rather than by "contains saree", so a stitched piece added to the catalogue
   * later -- a saree blouse, a pre-pleated saree -- is not quietly reclassified as fabric. It
   * decides the GST treatment as well as the label: unstitched fabric is 5% flat, stitched
   * apparel is 5% or 18% depending on what one piece sells for.
   *
   * Applied when the dress type is CHOSEN, never on load, and never again afterwards -- so a
   * shopkeeper who then presses READY TO WEAR keeps it.
   */
  const chooseDressType = (val) => {
    updateProductData('dressType', val);
    if (unstitchedLabel && /^saree$/i.test(String(val).trim())) {
      updateProductData('productType', unstitchedLabel);
    }
  };

  /*
   * The brand starts as the shop's own name, which is what it is for all but a few products.
   *
   * Once only, and only on a product being added: filling it in on an EDIT would silently rewrite
   * a saved product's brand the moment somebody opened it. It also waits for the name to load
   * rather than reading it on the first render, which is the mistake that left the try-on picker
   * defaulting to nothing.
   */
  const storeName = branding?.businessName ?? '';
  const brandFilled = React.useRef(false);
  React.useEffect(() => {
    if (brandFilled.current) return;
    if (productData.id || productData.brand) { brandFilled.current = true; return; }
    if (!storeName) return;
    updateProductData('brand', storeName);
    brandFilled.current = true;
  }, [storeName, productData.id, productData.brand, updateProductData]);

  return (
    <div className="animate-fade-in mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      <div className="glass-panel mobile-col" style={{ padding: '32px', display: 'flex', gap: '48px', flex: 1 }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <WhatAreYouAdding
            part="top"
            selling={selling}
            onChange={(v) => updateProductData('selling', v)}
            isNew={!productData.id}
            onCancel={() => navigate('/products')}
          />
          <div>
            <label className="input-label">Product Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={isFabric ? 'e.g. Kanchi silk, maroon' : 'e.g. Emerald Satin Evening Gown'}
              value={productData.title}
              maxLength={120}
              onChange={(e) => updateProductData('title', e.target.value)}
            />
            {sameName.length > 0 && (
              <p role="status" style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--accent-gold)' }}>
                You already have a product called "{sameName[0].title}"{sameName[0].productCode ? ` (${sameName[0].productCode})` : ''}. Saving adds a second one. Change the name if it is not a different product.
              </p>
            )}
          </div>

          {/* For fabric: what kind it is (fabric, lining, lace, buttons...), right after its name. */}
          <WhatAreYouAdding part="kinds" selling={selling} onChange={(v) => updateProductData('selling', v)} isNew={!productData.id} />

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
            
            {!isFabric && <div style={{ flex: 1 }}>
              <label className="input-label">Dress Type</label>
              <Dropdown 
                value={productData.dressType}
                placeholder="Select Dress Type"
                options={DRESS_TYPES}
                emptyText={productData.category ? undefined : 'Choose a Product Category first.'}
                onChange={chooseDressType}
              />
            </div>}
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

          {/*
            * Under the craft and the fabric, which is what it is describing.
            *
            * It sat at the top of the other column, opposite the product's name, where it was the
            * tallest thing on the form and pushed the tax fields down past everything else. The
            * description is written last, after the shop has said what the garment IS, so it
            * belongs at the end of that thought rather than at the top of a second one.
            *
            * flex: 1 so it takes the height the left column has left over -- the same trick it
            * used in the other column, which is what made it a comfortable box to write in.
            */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '120px' }}>
            <label className="input-label">Product Description</label>
            <textarea
              className="input-field"
              placeholder="Describe your product..."
              value={productData.description}
              onChange={(e) => updateProductData('description', e.target.value)}
              style={{ resize: 'none', flex: 1, minHeight: '96px' }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!isFabric && <div>
            {/* "Stitching", not "Product type": garment or fabric is asked first (the pop-up), and this only says whether
                the garment is stitched -- which also decides its GST (unstitched cloth is 5% flat). */}
            <label className="input-label">Stitching</label>
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
          </div>}
          
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

          {/*
            * GST, asked here rather than only on the edit screen.
            *
            * These fields existed only once a product had been created, so every product added
            * through this wizard began with no HSN code and no rate -- and a product with no rate
            * cannot go on a tax invoice. The shop found out at the counter, one product at a
            * time. Optional, because a shop that is not registered never needs any of it and a
            * draft is a save-point for something unfinished.
            */}
          <div className="mobile-col" style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">HSN code</label>
              <input
                type="text"
                className="input-field"
                placeholder="4, 6 or 8 digits"
                inputMode="numeric"
                value={productData.hsnCode}
                onChange={(e) => updateProductData('hsnCode', e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">GST rate</label>
              <Select aria-label="GST rate"
                className="input-field"
                value={productData.taxRateBps}
                onChange={(e) => updateProductData('taxRateBps', e.target.value)}
              >
                {GST_RATES.map(r => <option key={r.label} value={r.value}>{r.label}</option>)}
              </Select>
            </div>
          </div>

          {!isFabric && <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={productData.taxSlabbed}
                onChange={(e) => updateProductData('taxSlabbed', e.target.checked)}
              />
              Priced by the piece: 5% up to ₹2,500, 18% above
            </label>
            <TickWarning show={!!productData.taxSlabbed}>GST will be worked out per piece: 5% when one piece sells for ₹2,500 or less, 18% above. Use it only for ready-made garments sold by the piece.</TickWarning>
          </div>}

          {isFabric ? (
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>Fabric is usually 5% GST. Cotton and silk fabric HSN codes start with 52 and 50.</p>
          ) : <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input
                type="checkbox"
                checked={productData.isService}
                onChange={(e) => updateProductData('isService', e.target.checked)}
              />
              This is a service (no stock)
            </label>
            <TickWarning show={!!productData.isService}>
              {productData.dressType ? <><b>{productData.dressType}</b> is a product you sell from stock, so this is probably not what you want. </> : null}
              This product will keep no stock: it will not show in Inventory, and any stock you add is not recorded. Use this only for work you charge for, like fall &amp; pico or stitching. A saree, or anything you keep on a shelf, is not a service.
            </TickWarning>
            <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: 'var(--text-muted)' }}>A service such as fall &amp; pico or stitching: sold at the till for its price, with no stock counted. Put its SAC code in the HSN box.</p>
          </div>}
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
            // Only a new product is asked: one saved before this question existed is simply what it was.
            if (asksWhat(fabrics) && !what && !productData.id) {
              toast.error('Choose a garment or fabric first.');
              return;
            }
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
