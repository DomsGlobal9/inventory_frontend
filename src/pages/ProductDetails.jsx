import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, Box, History, Image as ImageIcon, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  useProduct as useProductHook, 
  useArchiveProduct, 
  useRestoreProduct, 
  useTrashProduct, 
  useHardDeleteProduct 
} from '../hooks/useProducts';
import VariantTable from '../components/VariantTable';
import ImageGallery from '../components/ImageGallery';
import TransactionHistory from '../components/TransactionHistory';
import StockMovementModal from '../components/StockMovementModal';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  // A barcode scan deep-links here as /products/:id?tab=variants&variant=<id>, so the tab
  // opens on the scanned variant instead of dumping the user on Overview to hunt for it.
  const [searchParams] = useSearchParams();
  const scannedVariantId = searchParams.get('variant');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const trashMutation = useTrashProduct();
  const hardDeleteMutation = useHardDeleteProduct();

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data, isLoading, isError } = useProductHook(id);
  const product = data?.data;

  if (isLoading) return <PageLoader text="Loading product details..." />;
  if (isError || !product) return <div style={{ padding: '48px', color: 'var(--text-muted)' }}>Product not found.</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Package },
    { id: 'variants', label: 'Variants', icon: Box },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'inventory', label: 'Inventory History', icon: History }
  ];

  const handleAction = (type) => {
    switch (type) {
      case 'archive':
        archiveMutation.mutate(id);
        break;
      case 'restore':
        restoreMutation.mutate(id);
        break;
      case 'trash': {
        // Say what it means for THIS product, not in the abstract. "Hidden from operations"
        // is not a sentence anybody running a shop would say, and it does not mention that
        // this particular product is holding stock -- 23 pieces, in the case that prompted
        // this. Whether stock is involved is the thing that decides if trashing is a tidy-up
        // or a mistake.
        const units = product.variantSummary?.totalUnits || 0;
        const stockLine = units > 0
          ? ` It still has ${units} ${units === 1 ? 'piece' : 'pieces'} in stock, and those stay where they are — trashing does not write them off.`
          : '';
        setConfirmState({
          isOpen: true,
          title: 'Move to Trash',
          message:
            `"${product.title}" will stop appearing when you take stock in or out, raise a purchase order, or sell.` +
            stockLine +
            ' You can put it back from the Trash tab at any time.',
          confirmText: 'Move to Trash',
          confirmStyle: 'danger',
          // mutate, not mutateAsync. The page behind this modal now changes the moment the
          // action is taken, so holding the modal open for the round trip put a "Working..."
          // button on top of a page that already said TRASHED -- measured at about ten
          // seconds of the two contradicting each other. A failure rolls the page back and
          // says so, which is the honest signal; the modal has done its job once the
          // question is answered.
          onConfirm: () => { trashMutation.mutate(id); }
        });
        break;
      }
      case 'hardDelete': {
        const variants = product.variantSummary?.variantCount || 0;
        setConfirmState({
          isOpen: true,
          title: 'Permanently Delete',
          message:
            `"${product.title}" (${product.productCode}) will be erased for good, along with ` +
            `${variants} ${variants === 1 ? 'size/colour' : 'sizes and colours'} and every photograph of it. ` +
            'There is no undo and no copy kept anywhere. If you only want it out of the way, cancel this and leave it in the Trash instead.',
          confirmText: 'Delete Permanently',
          confirmStyle: 'danger',
          requireTypeToConfirm: 'CONFIRM',
          // This one keeps waiting on purpose: it is irreversible, and it navigates away.
          // Leaving the page before knowing it actually happened is how you end up unsure
          // whether a thing still exists.
          onConfirm: () => hardDeleteMutation.mutateAsync(id).then(() => navigate('/products'))
        });
        break;
      }
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0 }}>
      
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" onClick={() => navigate('/products')} style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px', margin: 0 }}>{product.title}</h1>
              <span style={{ 
                padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                backgroundColor: product.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: product.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-secondary)'
              }}>
                {product.status}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{product.productCode} • {product.category}</span>
          </div>
        </div>

        {/* Actions Menu */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(product.status === 'ACTIVE' || product.status === 'DRAFT') && (
            <button className="btn-secondary" onClick={() => handleAction('archive')}>
              Archive
            </button>
          )}
          {(product.status === 'ARCHIVED' || product.status === 'TRASHED') && (
            <button className="btn-secondary" onClick={() => handleAction('restore')}>
              Restore
            </button>
          )}
          {product.status !== 'TRASHED' && (
            <button className="btn-secondary" style={{ color: 'var(--accent-warning)', borderColor: 'var(--accent-warning)' }} onClick={() => handleAction('trash')}>
              Move to Trash
            </button>
          )}
          {product.canHardDelete && product.status === 'TRASHED' && (
            <button className="btn-danger" onClick={() => handleAction('hardDelete')}>
              Permanently Delete
            </button>
          )}
          {!product.canHardDelete && product.status === 'TRASHED' && (
            // Was a button that merely LOOKED disabled -- no disabled attribute, no handler --
            // so pressing it did nothing at all and the reason lived in a title tooltip, which
            // does not exist on a touch screen and is missed on a desktop. Somebody trying to
            // delete something got silence. Now the reason is on the page, and pressing it
            // says the same thing out loud.
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              <button
                className="btn-secondary"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                onClick={() => toast(product.hardDeleteReason || 'This product cannot be deleted yet.', { icon: 'ℹ️' })}
              >
                Permanently Delete
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '220px' }}>
                {product.hardDeleteReason}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Summary */}
      <motion.div variants={item} className="mobile-2-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Base Price</p>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0' }}>₹{product.basePrice}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Variants</p>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0' }}>{product.variantSummary?.variantCount || 0}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Stock Units</p>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0' }}>{product.variantSummary?.totalUnits || 0}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '20px', border: product.variantSummary?.lowStockVariants > 0 ? '1px solid var(--accent-danger)' : '' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Low Stock Variants</p>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: product.variantSummary?.lowStockVariants > 0 ? 'var(--accent-danger)' : 'inherit' }}>
            {product.variantSummary?.lowStockVariants || 0}
          </h2>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', flexShrink: 0, overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                background: 'transparent',
                borderBottom: `2px solid ${isActive ? 'var(--text-primary)' : 'transparent'}`,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <Icon size={16} />
              {tab.label}
              {isActive && (
                <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, background: 'var(--text-primary)' }} />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={item} className="mobile-no-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="mobile-no-scroll"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            {activeTab === 'overview' && (
              <div className="glass-panel mobile-no-scroll" style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '16px' }}>Product Overview</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{product.description || 'No description provided.'}</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px', marginTop: '32px' }}>
                      {product.brand && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Brand</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.brand}</p>
                        </div>
                      )}
                      {product.category && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.category}</p>
                        </div>
                      )}
                      {product.productType && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.productType}</p>
                        </div>
                      )}
                      {product.dressType && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dress Style</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.dressType}</p>
                        </div>
                      )}
                      {product.fabric && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fabric</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.fabric}</p>
                        </div>
                      )}
                      {product.craft && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Craft/Work</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.craft}</p>
                        </div>
                      )}
                      {product.gender && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target Gender</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.gender}</p>
                        </div>
                      )}
                      {product.ageGroup && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Age Group</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.ageGroup}</p>
                        </div>
                      )}
                      {product.weight && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Weight</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.weight}</p>
                        </div>
                      )}
                      {product.dimensions && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dimensions</p>
                          <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{product.dimensions}</p>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</p>
                        <span style={{ 
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                          backgroundColor: product.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: product.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-secondary)'
                        }}>
                          {product.status}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Created At</p>
                        <p style={{ fontWeight: '500', margin: '4px 0 0' }}>{new Date(product.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, width: '280px', padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Identifiers</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Product Code</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text-primary)' }}>{product.productCode}</span>
                          <button onClick={() => handleCopy(product.productCode, 'prd-code')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }} title="Copy Product Code">
                            {copiedId === 'prd-code' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Product ID (UUID)</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all', paddingRight: '8px' }}>{product.id}</span>
                          <button onClick={() => handleCopy(product.id, 'prd-id')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', flexShrink: 0 }} title="Copy UUID">
                            {copiedId === 'prd-id' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      
                      {/* The try-on code, for printing on the garment's tag.
                          The address comes from the server (`tryOnScanUrl`), not from this
                          screen: the code gets printed and a printed tag outlives every
                          deploy, so where it points is one decision in one place. It used to
                          be assembled here as scaleezy.com/tryon/<code>, which nothing has
                          ever served -- every code printed from this screen led nowhere. */}
                      <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                          Try-On QR Code
                        </span>

                        {product.tryOnScanUrl ? (
                          <>
                            <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', display: 'inline-flex' }}>
                              <QRCodeSVG value={product.tryOnScanUrl} size={120} />
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                              {product.status === 'ACTIVE'
                                ? 'A customer scans this and sees themselves wearing it.'
                                // Worth saying here rather than letting someone print a tag
                                // and discover it in the shop: the scan resolves published
                                // products only.
                                : 'This works once the product is published — a scan finds nothing while it is a draft.'}
                            </p>
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px' }}>
                            Try-On is not switched on for this workspace yet, so there is no code to print.
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'variants' && (
              <VariantTable productId={product.id} productName={product.title} productCode={product.productCode} productBasePrice={product.basePrice} highlightVariantId={scannedVariantId} />
            )}

            {activeTab === 'images' && (
              <ImageGallery productId={product.id} />
            )}

            {activeTab === 'inventory' && (
              <TransactionHistory productId={product.id} onNewTransaction={() => setIsStockModalOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      
      <StockMovementModal 
        isOpen={isStockModalOpen} 
        onClose={() => setIsStockModalOpen(false)} 
        productId={product.id} 
      />
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
        requireTypeToConfirm={confirmState.requireTypeToConfirm}
      />
    </motion.div>
  );
}
