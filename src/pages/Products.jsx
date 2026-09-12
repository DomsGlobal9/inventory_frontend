import React from 'react';
import LoadFailed from '../components/LoadFailed';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useProducts, useBulkSetProductStatus } from '../hooks/useProducts';
import { useProduct } from '../context/ProductContext';
import BulkUpdateModal from '../components/BulkUpdateModal';
import ProductImportModal from '../components/ProductImportModal';
import PageLoader from '../components/PageLoader';
import Select from '../components/common/Select';
import ConfirmModal from '../components/ConfirmModal';


export default function Products() {
  const navigate = useNavigate();
  const { resetProductData } = useProduct();
  const [statusFilter, setStatusFilter] = React.useState(''); // Empty means default (ACTIVE, DRAFT)
  const { data, isLoading, isError, error, refetch } = useProducts({ page: 1, limit: 50, status: statusFilter || undefined });

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(() => new Set());
  const [confirmState, setConfirmState] = React.useState({ isOpen: false });
  const bulkStatus = useBulkSetProductStatus();

  const products = data?.data || [];

  // A selection belongs to the list it was made from. Changing the filter shows different
  // products, and acting on ids the merchant can no longer see is how somebody publishes
  // something they never chose.
  React.useEffect(() => { setSelected(new Set()); }, [statusFilter]);

  const selectedProducts = products.filter(p => selected.has(p.id));
  const draftsSelected = selectedProducts.filter(p => p.status === 'DRAFT');
  const liveSelected = selectedProducts.filter(p => p.status === 'ACTIVE');

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allOnPageSelected = products.length > 0 && products.every(p => selected.has(p.id));
  const toggleAll = () => setSelected(allOnPageSelected ? new Set() : new Set(products.map(p => p.id)));

  /**
   * Publishing a selection, with the one warning the single-product button also gives.
   *
   * Bulk must not become the way round the "this has no photographs" check -- a website full
   * of blank cards is exactly what that check exists to prevent. It cannot ask once per
   * product either, so it counts them and asks once.
   */
  const runBulk = (status) => {
    const targets = status === 'ACTIVE' ? draftsSelected : liveSelected;
    if (targets.length === 0) return;

    // Counted per SIZE AND COLOUR, not per product. "This product has photographs" passes a
    // saree with three shots of the red one and none of the blue, and the customer who picks
    // blue is shown red -- so the number worth warning about is how many products are going
    // live with a colour nobody photographed.
    const unphotographed = targets.filter(p => (p.variantSummary?.variantsWithoutImages || 0) > 0).length;
    const noVariants = targets.filter(p => !(p.variantSummary?.variantCount > 0)).length;
    const verb = status === 'ACTIVE' ? 'Publish' : 'Unpublish';

    const concerns = [
      unphotographed > 0 && `${unphotographed} ${unphotographed === 1 ? 'has a size or colour' : 'have sizes or colours'} with no photograph`,
      noVariants > 0 && `${noVariants} ${noVariants === 1 ? 'has' : 'have'} no sizes or colours at all`
    ].filter(Boolean);

    const apply = () => bulkStatus.mutate(
      { ids: targets.map(p => p.id), status },
      {
        onSuccess: (res) => {
          const r = res?.data ?? res;
          const word = status === 'ACTIVE' ? 'published' : 'moved back to draft';
          if (r?.failed?.length) {
            toast.error(`${r.changed} ${word}. ${r.failed.length} could not be: ${r.failed[0]?.reason}`);
          } else {
            toast.success(`${r.changed} ${r.changed === 1 ? 'product' : 'products'} ${word}.`);
          }
          setSelected(new Set());
          setConfirmState({ isOpen: false });
        }
      }
    );

    if (status === 'ACTIVE' && concerns.length) {
      setConfirmState({
        isOpen: true,
        title: `Publish ${targets.length} ${targets.length === 1 ? 'product' : 'products'}?`,
        message: `Of these, ${concerns.join(' and ')}. They will go live as they are — customers and the try-on codes will find them. You can add what is missing first and publish afterwards.`,
        confirmText: `Publish ${targets.length} anyway`,
        confirmStyle: 'warning',
        onConfirm: apply
      });
    } else {
      setConfirmState({
        isOpen: true,
        title: `${verb} ${targets.length} ${targets.length === 1 ? 'product' : 'products'}?`,
        message: status === 'ACTIVE'
          ? 'They go on sale immediately, and any connected website is told about them.'
          : 'They come off the storefront straight away. Their stock and history are untouched, and you can publish them again at any time.',
        confirmText: `${verb} ${targets.length}`,
        confirmStyle: status === 'ACTIVE' ? 'primary' : 'warning',
        onConfirm: apply
      });
    }
  };

  const handleExport = () => {
    import('../utils/csvUtils').then(({ exportToCSV }) => {
      const exportData = products.map(p => ({
        ID: p.id,
        Title: p.title,
        Code: p.productCode,
        Category: p.category,
        BasePrice: p.basePrice,
        Status: p.status,
        VariantCount: p.variantSummary?.variantCount || 0,
        TotalUnits: p.variantSummary?.totalUnits || 0
      }));
      exportToCSV(exportData, 'Products');
    });
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
    <div className="mobile-no-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--text-primary)' }}>Products</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage your catalog, variants, and base pricing.</p>
        </div>
        <div className="mobile-col" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Select 
            className="input-field" 
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {/* Drafts had no filter of their own, which mattered more than it looks: a
                bulk import creates drafts by design -- a spreadsheet carries no
                photographs -- and this shop has 123 of them against 4 published. There was
                no way to list the ones still waiting to go live, and therefore no way to
                work through them. The API already accepted any status; only the options
                were missing. */}
            <option value="">Active & Drafts</option>
            <option value="DRAFT">Drafts only</option>
            <option value="ACTIVE">Published only</option>
            <option value="ARCHIVED">Archived</option>
            <option value="TRASHED">Trash</option>
          </Select>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleExport}
            disabled={!products.length}
          >
            <Download size={16} />
            Export
          </button>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsBulkUpdateModalOpen(true)}
          >
            <Upload size={16} />
            Import Updates
          </button>
          {/* Two imports, deliberately separate. "Import Updates" edits stock and prices on
              variants that already exist, matched on SKU. "Import Products" creates and
              updates whole products from one file. Merging them would mean one screen whose
              behaviour depends on which columns happen to be present. */}
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsImportOpen(true)}
          >
            <FileSpreadsheet size={16} />
            Import Products
          </button>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => {
              resetProductData();
              navigate('/add/general');
            }}
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Appears only when something is chosen, and says what it will do to what. A bar that
          is always there with "0 selected" is a bar that is always in the way. */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0,
          padding: '12px 16px', borderRadius: '10px',
          background: 'var(--bg-input)', border: '1px solid var(--border-light)'
        }}>
          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {selected.size} selected
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {draftsSelected.length > 0 && `${draftsSelected.length} draft${draftsSelected.length === 1 ? '' : 's'}`}
            {draftsSelected.length > 0 && liveSelected.length > 0 && ' · '}
            {liveSelected.length > 0 && `${liveSelected.length} published`}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => setSelected(new Set())}>Clear</button>
            {liveSelected.length > 0 && (
              <button className="btn-secondary" onClick={() => runBulk('DRAFT')} disabled={bulkStatus.isPending}>
                Unpublish {liveSelected.length}
              </button>
            )}
            {draftsSelected.length > 0 && (
              <button className="btn-primary" onClick={() => runBulk('ACTIVE')} disabled={bulkStatus.isPending}>
                {bulkStatus.isPending ? 'Publishing…' : `Publish ${draftsSelected.length}`}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="table-container" style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <PageLoader text="Loading products..." />
        ) : isError ? (<LoadFailed what="products" error={error} onRetry={refetch} />) : products.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products added yet.
          </div>
        ) : (
          <motion.table variants={container} initial="hidden" animate="show" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    aria-label="Select every product on this page"
                    title="Select every product on this page"
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Stock Units</th>
                <th>Base Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <motion.tr 
                  variants={item}
                  key={product.id} 
                  onClick={() => navigate(`/products/${product.id}`)}
                  style={{ cursor: 'pointer', background: selected.has(product.id) ? 'var(--bg-input)' : undefined }}
                >
                  {/* stopPropagation: the whole row opens the product, and a tick that also
                      navigated away would make selecting more than one impossible. */}
                  <td onClick={(e) => e.stopPropagation()} style={{ width: '44px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.title}`}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: '500', fontSize: '14px' }}>{product.title}</p>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.productCode}</span>
                      </div>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.variantSummary?.variantCount || 0}</td>
                  <td style={{ color: product.variantSummary?.lowStockVariants > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: '500' }}>
                    {product.variantSummary?.totalUnits || 0}
                  </td>
                  <td style={{ fontWeight: '500' }}>₹{product.basePrice}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                      backgroundColor: product.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: product.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-secondary)'
                    }}>
                      {product.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        )}
      </div>
      
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmStyle={confirmState.confirmStyle}
      />

      <BulkUpdateModal 
        isOpen={isBulkUpdateModalOpen} 
        onClose={() => setIsBulkUpdateModalOpen(false)} 
      />

      <ProductImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => refetch?.()}
      />
    </div>
  );
}
