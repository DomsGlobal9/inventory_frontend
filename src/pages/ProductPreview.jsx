import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, CheckCircle, Loader2, ArrowLeft, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../context/ProductContext';
import { useCreateProduct, useUpdateProduct } from '../hooks/useProducts';
import { mapProductFormToApiPayload } from '../mappers/product.mapper';
import { bulkCreateVariants } from '../services/variant.service';
import { uploadImageFile, dataUrlToFile } from '../services/image.service';
import { useCatalogData } from '../hooks/useCatalogConfig';
import { useLocationContext } from '../contexts/LocationContext';
import ImageLightbox from '../components/ImageLightbox';

const VIEW_ORDER = ['front', 'left', 'right', 'back'];

export default function ProductPreview() {
  const { productData, resetProductData } = useProduct();
  const navigate = useNavigate();
  const { colors } = useCatalogData();
  const { currentLocation } = useLocationContext();
  const [applyToAllLocations, setApplyToAllLocations] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const getColorInfo = (code) => {
    const baseColor = colors.find(c => c.code === code);
    if (baseColor) return { name: baseColor.name, value: baseColor.value };
    if (code.includes('_')) {
      const [name, hex] = code.split('_');
      return { name: `${name.charAt(0).toUpperCase() + name.slice(1)} Shade`, value: hex };
    }
    return { name: code, value: '#808080' };
  };

  // Calculate totals
  const totalVariants = productData.selectedSizes.length * productData.selectedColors.length;
  
  let totalUnits = 0;
  Object.values(productData.units).forEach(sizeObj => {
    Object.values(sizeObj).forEach(val => {
      totalUnits += parseInt(val || 0, 10);
    });
  });

  const estimatedValue = totalUnits * (parseFloat(productData.price) || 0);

  const hasPhotos = (productData.imageUrls?.length > 0) ||
    Object.values(productData.sourceUploadFiles || {}).some(Boolean);

  // Single source of truth for both the checklist display and whether Publish is
  // actually clickable -- these used to drift apart (checklist showed complete while
  // the button stayed enabled regardless), letting an incomplete product reach the
  // backend and fail with a raw validation error the user had to dig out of DevTools.
  const checklist = [
    { label: 'Product Information', done: Boolean(productData.title?.trim()) && Boolean(productData.category) },
    { label: 'Sizes Added', done: productData.selectedSizes.length > 0 },
    { label: 'Colors Added', done: productData.selectedColors.length > 0 },
    { label: 'Base Price Set', done: Number(productData.price) > 0 },
    { label: 'At Least 1 Photo', done: hasPhotos },
  ];
  const canPublish = checklist.every(item => item.done);

  const handlePublish = async () => {
    // `isPublished` is what product.mapper.ts reads to decide ACTIVE vs DRAFT, and nothing
    // in the app ever set it -- so every product created through this wizard was written as
    // DRAFT no matter what, and there is no other UI anywhere that can activate one
    // (ProductDetails offers only Archive/Restore/Trash). The visible symptom was the
    // dashboard's "Active Products" card sitting permanently at 0 while the catalog filled
    // up. This button is the publish action -- reaching it means the checklist passed -- so
    // say so explicitly rather than relying on a flag that is never written.
    const payload = { ...mapProductFormToApiPayload(productData), status: 'ACTIVE' };

    // Build variant payload from sizes x colors x units.
    // Takes the product code the BACKEND assigned, not the one in `payload`: the backend
    // generates its own sequential code (PRD-0007) and ignores whatever the client sent,
    // while product.mapper.ts fabricates a throwaway `SE-<random>` when the form has no
    // code. SKUs were therefore prefixed with a random number unrelated to the product --
    // and two products drawing the same random number produced duplicate SKUs, whose
    // creation failures were only ever counted as "skipped".
    const buildVariants = (productCode) => {
      const variants = [];
      productData.selectedColors.forEach(colorCode => {
        const colorInfo = getColorInfo(colorCode);
        productData.selectedSizes.forEach(size => {
          const qty = parseInt(productData.units?.[colorCode]?.[size] || '0', 10);
          // Generate a clean SKU
          const safeName = colorInfo.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
          const sku = `${productCode}-${safeName}-${size}`;
          variants.push({
            sku,
            size,
            colorName: colorInfo.name,
            hexCode: colorInfo.value,
            quantity: qty,
            reorderLevel: 5,
          });
        });
      });
      return variants;
    };

    // Persists both the AI-generated catalog views and the original flat-lay
    // reference uploads to Supabase + the backend, so they show up together on the
    // product's Images tab. Runs after the product exists so images can be scoped
    // under its productId in storage.
    const persistImages = async (productId) => {
      // No tenant here either -- the server owns the storage path.
      let orderIndex = 0;

      const generatedViews = productData.generatedGarmentViews || {};
      for (const viewKey of VIEW_ORDER) {
        const dataUrl = generatedViews[viewKey];
        if (!dataUrl || !dataUrl.startsWith('data:')) continue;
        try {
          const file = dataUrlToFile(dataUrl, `${viewKey}.jpg`);
          await uploadImageFile(productId, file, {
            isPrimary: orderIndex === 0,
            altText: `${productData.title} - ${viewKey} view`,
            imageType: 'GALLERY',
            orderIndex: orderIndex++
          });
        } catch (err) {
          console.error(`Failed to upload generated ${viewKey} view:`, err);
        }
      }

      // When there are generated views, these uploads were the flat-lay references used
      // to produce them (RAW_UPLOAD). When there are none -- dress types the Try-On API
      // doesn't support -- these uploads *are* the product's photos (GALLERY).
      const hadGeneratedViews = orderIndex > 0;
      const sourceFiles = Object.values(productData.sourceUploadFiles || {}).filter(Boolean);
      for (const file of sourceFiles) {
        try {
          await uploadImageFile(productId, file, {
            isPrimary: orderIndex === 0,
            altText: hadGeneratedViews ? `${productData.title} - flat lay reference` : productData.title,
            imageType: hadGeneratedViews ? 'RAW_UPLOAD' : 'GALLERY',
            orderIndex: orderIndex++
          });
        } catch (err) {
          console.error('Failed to upload product photo:', err);
        }
      }

      if (orderIndex === 0) return; // nothing to report
      const total = VIEW_ORDER.filter(v => generatedViews[v]?.startsWith('data:')).length + sourceFiles.length;
      if (orderIndex < total) {
        toast.error(`${total - orderIndex} of ${total} images failed to upload -- you can add them manually from the product's Images tab.`);
      }
    };

    if (productData.id) {
      updateMutation.mutate(
        { id: productData.id, data: payload },
        {
          onSuccess: async () => {
            await persistImages(productData.id);
            resetProductData();
            navigate('/products');
          }
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: async (res) => {
          // res.data is the created product object (api interceptor returns response.data)
          const newProductId = res?.data?.id;
          const newProductCode = res?.data?.productCode || payload.productCode;
          const variants = buildVariants(newProductCode);

          if (newProductId && variants.length > 0) {
            try {
              await bulkCreateVariants(newProductId, variants, applyToAllLocations);
            } catch (err) {
              console.error('Variant creation failed:', err);
              // Silently swallowing this left a published product with no sellable
              // variants and no indication anything went wrong.
              toast.error(err?.message || 'The product was created but its variants could not be added. Add them from the product page.');
            }
          }

          if (newProductId) {
            await persistImages(newProductId);
          }

          resetProductData();
          navigate('/products');
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const EyeOverlay = ({ src, alt }) => (
    <button
      onClick={(e) => { e.stopPropagation(); setLightboxSrc(src); }}
      title="View full size"
      style={{
        position: 'absolute', top: '8px', right: '8px',
        width: '28px', height: '28px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 1
      }}
    >
      <Eye size={14} />
    </button>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '32px' }}>
      <div>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', paddingLeft: 0 }}
          onClick={() => navigate('/add/upload')}
        >
          <ArrowLeft size={16} />
          BACK TO EDIT
        </button>
      </div>

      <div style={{ display: 'flex', gap: '48px' }}>
      {/* Left: Product Images */}
      <div style={{ flex: '1', maxWidth: '400px' }}>
        <div className="glass-panel" style={{ position: 'relative', height: '500px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          {productData.imageUrls && productData.imageUrls.length > 0 ? (
            <>
              <img src={productData.imageUrls[0]} alt="Main product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <EyeOverlay src={productData.imageUrls[0]} alt="Main product" />
            </>
          ) : (
            <ImageIcon size={64} color="var(--border-focus)" />
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {(productData.imageUrls || []).slice(1, 4).map((url, i) => (
            <div key={i} className="glass-panel" style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={url} alt={`Thumbnail ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <EyeOverlay src={url} alt={`Thumbnail ${i + 1}`} />
            </div>
          ))}
          {(!productData.imageUrls || productData.imageUrls.length <= 1) && [1, 2, 3].map(i => (
            <div key={i} className="glass-panel" style={{ aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={24} color="var(--border-focus)" />
            </div>
          ))}
        </div>
      </div>

      {/* Center: Details */}
      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
            {productData.category} &nbsp;•&nbsp; {productData.brand || 'No Brand'}
          </span>
          <h2 style={{ fontSize: '32px', marginTop: '8px' }}>
            {productData.title || 'Untitled Product'}
          </h2>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
            {productData.description || 'No description provided.'}
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PRODUCT TYPE</span>
            <p style={{ marginTop: '8px', fontSize: '16px' }}>{productData.productType || 'N/A'}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>MATERIAL</span>
            <p style={{ marginTop: '8px', fontSize: '16px' }}>{productData.fabric || 'N/A'}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DESIGN TYPE</span>
            <p style={{ marginTop: '8px', fontSize: '16px' }}>{productData.craft || 'N/A'}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DRESS TYPE</span>
            <p style={{ marginTop: '8px', fontSize: '16px' }}>{productData.dressType || 'N/A'}</p>
          </div>
        </div>
        
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AVAILABLE SIZES</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {productData.selectedSizes.length > 0 ? productData.selectedSizes.map(size => (
              <div key={size} style={{ width: '40px', height: '32px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                {size}
              </div>
            )) : <span style={{ color: 'var(--text-secondary)' }}>None selected</span>}
          </div>
        </div>
        
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AVAILABLE COLORS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
            {productData.selectedColors.length > 0 ? productData.selectedColors.map(code => {
              const info = getColorInfo(code);
              return (
                <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: info.value, borderRadius: '50%', border: '1px solid var(--border-light)' }} />
                  <span style={{ fontSize: '14px' }}>{info.name}</span>
                </div>
              );
            }) : <span style={{ color: 'var(--text-secondary)' }}>None selected</span>}
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>BASE PRICE</span>
          <p style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', marginTop: '8px' }}>
            ₹{parseFloat(productData.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="glass-panel" style={{ padding: '32px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '14px', letterSpacing: '0.1em', marginBottom: '24px' }}>INVENTORY SUMMARY</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Variants (Sizes x Colors)</span>
            <span>{totalVariants}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: totalUnits > 0 ? '16px' : '24px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Units (Stock)</span>
            <span>{totalUnits}</span>
          </div>
          {totalUnits > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={applyToAllLocations}
                  onChange={(e) => setApplyToAllLocations(e.target.checked)}
                />
                {applyToAllLocations
                  ? 'Stock these units at every location'
                  : `Stock these units at ${currentLocation?.name || 'the selected location'} only`}
              </label>
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent-gold)' }}>EST. VALUE</span>
            <span style={{ fontSize: '20px' }}>
              ₹{estimatedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Right Sidebar: Status & Checklist */}
      <div style={{ flex: '1', maxWidth: '300px' }}>
        <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>STATUS</span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--bg-input)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>DRAFT</span>
          </div>
          
          <div style={{
            padding: '16px', borderRadius: '4px', marginBottom: '24px',
            backgroundColor: canPublish ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-input)',
            border: `1px solid ${canPublish ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-light)'}`
          }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: canPublish ? '#22c55e' : 'var(--text-secondary)' }}>
              {canPublish ? 'READY TO PUBLISH' : 'COMPLETE THE CHECKLIST BELOW'}
            </span>
          </div>

          <h4 style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '16px' }}>PUBLISHING CHECKLIST</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {checklist.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle size={16} color={item.done ? 'var(--accent-gold)' : 'var(--border-light)'} />
                <span style={{ fontSize: '14px', color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            onClick={handlePublish}
            disabled={isPending || !canPublish}
            title={!canPublish ? 'Complete the checklist above to publish' : undefined}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {isPending ? 'PUBLISHING...' : (productData.id ? 'UPDATE PRODUCT' : 'PUBLISH PRODUCT')}
          </button>
          
          <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '16px' }}>
            LAST SAVED: JUST NOW
          </p>
        </div>
      </div>
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
