import React from 'react';
import LoadFailed from '../components/LoadFailed';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Package, FileOutput, FileInput, FileSpreadsheet, LayoutGrid, List, Search, Images } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useProductSearch, useBulkSetProductStatus } from '../hooks/useProducts';
import ProductFilters, { ActiveFilters, SortMenu, LIST_KEYS } from '../components/products/ProductFilters';
import { useProduct } from '../context/ProductContext';
import { rowLink } from '../components/common/rowLink';
import BulkUpdateModal from '../components/BulkUpdateModal';
import ProductImportModal from '../components/ProductImportModal';
import BulkPhotosModal from '../components/BulkPhotosModal';
import PageLoader from '../components/PageLoader';
import Select from '../components/common/Select';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupees } from '../utils/money';
import ProductGrid from '../components/ProductGrid';
import { usePermission } from '../hooks/usePermission';


export default function Products() {
  const navigate = useNavigate();
  const { resumePath } = useProduct();
  const { can } = usePermission();
  const canEdit = can('product:update');

  /*
   * Search, filters and sort live in the page address: Back returns to the same list, a refresh
   * keeps it, and a link to "blue sarees under ₹5,000" can be sent to whoever is restocking.
   * Lists travel joined with "|" (services/product-filters splits them).
   */
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') ?? ''; // Empty means default (ACTIVE, DRAFT)
  const sort = params.get('sort') ?? 'new';
  const num = (k) => (params.get(k) === null || params.get(k) === '' ? undefined : Number(params.get(k)));
  const filters = {
    ...Object.fromEntries(LIST_KEYS.map(k => [k, params.get(k) ? params.get(k).split('|') : []])),
    min: num('min'), max: num('max'), q: params.get('q') ?? ''
  };
  const setParam = (changes) => setParams(prev => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(changes)) {
      const s = Array.isArray(v) ? v.join('|') : v === undefined || v === null ? '' : String(v);
      s ? next.set(k, s) : next.delete(k);
    }
    return next;
  }, { replace: true });
  const setStatusFilter = (s) => setParam({ status: s });
  const setFilters = (f) => setParam({ ...Object.fromEntries(LIST_KEYS.map(k => [k, f[k] ?? []])), min: f.min, max: f.max });
  const clearAll = () => { setSearchText(''); setParam({ ...Object.fromEntries(LIST_KEYS.map(k => [k, []])), min: undefined, max: undefined, q: '' }); };

  // Typing searches after a short pause, not on every key.
  const [searchText, setSearchText] = React.useState(filters.q);
  React.useEffect(() => {
    if (searchText.trim() === filters.q) return undefined;
    const t = setTimeout(() => setParam({ q: searchText.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);
  // Back or Forward changed the search in the address: the box follows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (filters.q !== searchText.trim()) setSearchText(filters.q); }, [filters.q]);

  /*
   * Table or photographs, remembered per person.
   *
   * Kept in localStorage rather than on the account: two people share a shop but not a habit,
   * and the one who works from the stockroom on a tablet wants pictures while the one doing the
   * books on a laptop wants columns. Neither should change the other's screen.
   *
   * Read inside the initialiser so the first paint is already the view they chose -- setting it
   * in an effect shows the table for a frame and then swaps, which reads as a glitch.
   */
  const [view, setView] = React.useState(() => {
    try {
      return localStorage.getItem('products.view') === 'grid' ? 'grid' : 'table';
    } catch {
      // Private browsing, or storage switched off. A preference is not worth an exception.
      return 'table';
    }
  });
  const chooseView = (next) => {
    setView(next);
    try { localStorage.setItem('products.view', next); } catch { /* as above */ }
  };
  /*
   * Fifty at a time, "Show more" for the next fifty. This page used to ask for the first fifty and
   * stop: a shop with 59 products could not reach nine of them from here.
   */
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useProductSearch({
    status: statusFilter || undefined, sort, q: filters.q || undefined,
    ...Object.fromEntries(LIST_KEYS.map(k => [k, filters[k].join('|') || undefined])),
    min: filters.min !== undefined ? String(filters.min) : undefined, max: filters.max !== undefined ? String(filters.max) : undefined
  });
  const firstPage = data?.pages?.[0];
  const meta = firstPage?.meta;
  const filtering = filters.q || LIST_KEYS.some(k => filters[k].length) || filters.min !== undefined || filters.max !== undefined;

  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  // null: closed. An array: open, with the sheet's photo links (empty when opened from the button).
  const [photosFor, setPhotosFor] = React.useState(null);
  const [selected, setSelected] = React.useState(() => new Set());
  const [confirmState, setConfirmState] = React.useState({ isOpen: false });
  const bulkStatus = useBulkSetProductStatus();

  // With a colour, price or stock filter on, each product carries only the colours that matched, so
  // the photo view shows the blue ones when Blue was picked rather than whichever colour comes first.
  const products = React.useMemo(() => (data?.pages ?? []).flatMap(p => p?.data ?? []).map(p =>
    Array.isArray(p.matches) ? { ...p, colours: (p.colours ?? []).filter(c => p.matches.includes(c.id)) } : p
  ), [data]);

  // A selection belongs to the list it was made from. Changing the filter shows different
  // products, and acting on ids the merchant can no longer see is how somebody publishes
  // something they never chose.
  React.useEffect(() => { setSelected(new Set()); }, [params]);

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
    // The whole page scrolls, with search, filters and the count pinned at the top (.pf-sticky). Only the
    // list used to scroll, inside a box that got shorter as the filters were added: one row of cards showed.
    <div className="mobile-no-scroll products-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
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
            {/* Out of the app: an arrow leaving a page (24 Oct, the user's choice over the download tray). */}
            <FileOutput size={16} />
            Export
          </button>
          {can('inventory:adjust') && (
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsBulkUpdateModalOpen(true)}
          >
            <FileInput size={16} />
            Import Updates
          </button>
          )}
          {/* Two imports, deliberately separate. "Import Updates" edits stock and prices on
              variants that already exist, matched on SKU. "Import Products" creates and
              updates whole products from one file. Merging them would mean one screen whose
              behaviour depends on which columns happen to be present. */}
          {(can('product:create') || canEdit) && (
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setIsImportOpen(true)}
          >
            <FileSpreadsheet size={16} />
            Import Products
          </button>
          )}
          {canEdit && (
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setPhotosFor([])}
          >
            <Images size={16} />
            Add photos
          </button>
          )}
          {can('product:create') && (
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate(resumePath())}
          >
            <Plus size={16} />
            Add Product
          </button>
          )}
        </div>
      </div>

      <div className="pf-sticky">
      <div className="pf-top">
        <label className="pf-search" htmlFor="product-search">
          <Search size={16} aria-hidden="true" />
          <input id="product-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, code, SKU, barcode or colour" autoComplete="off" />
        </label>
      </div>
      <ProductFilters facets={firstPage?.facets} value={filters} onChange={setFilters} />
      <ActiveFilters value={filters} onChange={setFilters} onClearAll={clearAll} />

      {/* Appears only when something is chosen, and says what it will do to what. A bar that
          is always there with "0 selected" is a bar that is always in the way. */}
      {canEdit && selected.size > 0 && (
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

      {/*
        The switch. Two buttons rather than a dropdown: there are two choices, both are one
        word, and a menu to pick between two things is a menu nobody opens twice.
      */}
      {!isLoading && !isError && meta && (
        <div className="pf-count-line">
          <span aria-live="polite" style={{ opacity: isFetching && !isFetchingNextPage ? 0.6 : 1 }}>
            {meta.total === meta.everything ? `${meta.total} ${meta.total === 1 ? 'product' : 'products'}` : `${meta.total} of ${meta.everything} products`}
            {' · '}{meta.colours} {meta.colours === 1 ? 'colour' : 'colours'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <SortMenu sort={sort} onChange={(s) => setParam({ sort: s === 'new' ? '' : s })} />
            {products.length > 0 && <span style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'table', label: 'List', Icon: List },
            { id: 'grid', label: 'Photos', Icon: LayoutGrid }
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => chooseView(id)}
              aria-pressed={view === id}
              title={id === 'grid' ? 'See the photographs' : 'See the details'}
              className={view === id ? 'btn-primary' : 'btn-secondary'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
            </span>}
          </span>
        </div>
      )}

      </div>

      {view === 'grid' && !isLoading && !isError && products.length > 0 ? (
        <div className="grid-container">
          <ProductGrid
            products={products}
            selected={selected}
            onToggle={canEdit ? toggleOne : undefined}
            onOpen={(id) => navigate(`/products/${id}`)}
          />
        </div>
      ) : (
      <div className="table-container" style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <PageLoader text="Loading products..." />
        ) : isError ? (<LoadFailed what="products" error={error} onRetry={refetch} />) : products.length === 0 ? (
          filtering ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'grid', gap: '10px', justifyItems: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Nothing matches all of these.</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Take off a filter above, or start again.</p>
              <button type="button" className="btn-secondary" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No products added yet.
          </div>
          )
        ) : (
          <motion.table variants={container} initial="hidden" animate="show" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {/* Selecting is only for publishing in bulk, so it goes when publishing does. */}
                {canEdit && <th style={{ width: '44px' }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    aria-label="Select every product on this page"
                    title="Select every product on this page"
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>}
                <th>Product</th>
                <th>Type</th>
                <th>Variants</th>
                <th>Stock Units</th>
                <th>Base Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                /* The selected background is inline and so beats the shared hover rule, which is
                   right: a ticked row should stay marked while the pointer moves over it. */
                <motion.tr
                  variants={item}
                  key={product.id}
                  {...rowLink(() => navigate(`/products/${product.id}`), { label: `Open ${product.title}` })}
                  style={{ background: selected.has(product.id) ? 'var(--bg-input)' : undefined }}
                >
                  {/* stopPropagation: the whole row opens the product, and a tick that also
                      navigated away would make selecting more than one impossible. */}
                  {canEdit && <td onClick={(e) => e.stopPropagation()} style={{ width: '44px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.title}`}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'var(--bg-input)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--text-secondary)" />
                      </div>
                      <div>
                        {/* A very long name used to stretch the table until CATEGORY, STOCK and
                            STATUS were off the screen for every row. */}
                        <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.title}>{product.title}</p>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.productCode}</span>
                      </div>
                    </div>
                  </td>
                  {/* What the shop calls it (Saree, Lehenga); the old category column said WOMEN on every row. */}
                  <td>{product.dressType || product.category}</td>
                  <td>{product.variantSummary?.variantCount || 0}</td>
                  <td style={{ color: product.variantSummary?.lowStockVariants > 0 ? 'var(--accent-danger)' : 'inherit', fontWeight: '500' }}>
                    {product.variantSummary?.totalUnits || 0}
                  </td>
                  <td style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{formatRupees(product.basePrice)}</td>
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
      )}

      {hasNextPage && meta && (
        <div className="pf-more">
          <button type="button" className="btn-secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : `Show ${Math.min(meta.limit, meta.total - products.length)} more · ${products.length} of ${meta.total} shown`}
          </button>
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

      <BulkUpdateModal 
        isOpen={isBulkUpdateModalOpen} 
        onClose={() => setIsBulkUpdateModalOpen(false)} 
      />

      <ProductImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => refetch?.()}
        onAddPhotos={canEdit ? (links) => { setIsImportOpen(false); setPhotosFor(links || []); } : undefined}
      />

      <BulkPhotosModal
        isOpen={photosFor !== null}
        photoLinks={photosFor || []}
        onClose={() => { setPhotosFor(null); refetch?.(); }}
        onDone={() => refetch?.()}
      />
    </div>
  );
}
