import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PackageSearch, Star, Trash2, AlertTriangle, FileText, Search, X } from 'lucide-react';
import {
  useSupplierProducts,
  useSetPreferredSupplier,
  useUnlinkSupplierProduct
} from '../hooks/useSuppliers';
import ConfirmModal from './ConfirmModal';
import { isLowStock } from '../utils/lowStock';
import { usePermission } from '../hooks/usePermission';
import { useLocationContext } from '../contexts/LocationContext';
import { rowLink } from './common/rowLink';

/**
 * What we buy from one supplier.
 *
 * The counterpart to VariantSuppliersPanel: the same relationship read from the supplier's
 * end. Stock and reorder level are shown alongside each item because the reason to open this
 * list is almost always "what do I need to order from them", and that question is
 * unanswerable without knowing what is running low.
 */
const formatMoney = (value) =>
  value == null ? null : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function SupplierProductsPanel({ supplierId, supplierName, supplierIsActive = true }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'low' | 'preferred'
  const { data: links = [], isLoading } = useSupplierProducts(supplierId, search || undefined);
  const setPreferred = useSetPreferredSupplier();
  const unlink = useUnlinkSupplierProduct();
  // The link awaiting a yes on the remove dialog, or null. Holds the whole row so the
  // dialog can name the item after the table behind it has re-rendered.
  const [linkToRemove, setLinkToRemove] = useState(null);
  const navigate = useNavigate();
  const { can } = usePermission();
  const { currentLocation } = useLocationContext();
  const canOrder = can('purchase_order:create');
  const canEditLinks = can('supplier:update');

  /**
   * What this item actually sells for at the location currently selected.
   */
  const sellingPriceOf = (variant) => {
    const profile = currentLocation?.id
      ? (variant?.locationProfiles || []).find(pr => pr.locationId === currentLocation.id)
      : undefined;
    const override = profile?.priceOverride;
    if (override !== null && override !== undefined && override !== '') return Number(override);
    if (variant?.sellingPrice) return Number(variant.sellingPrice);
    return variant?.product?.basePrice ? Number(variant.product.basePrice) : null;
  };

  const stockOf = (variant) =>
    (variant?.stocks || []).reduce((sum, s) => sum + (s.quantity || 0), 0);

  const isLow = (variant) => isLowStock(stockOf(variant), variant?.reorderLevel);

  const totalCount = links.length;
  const lowCount = useMemo(() => links.filter(l => isLow(l.variant)).length, [links]);
  const preferredCount = useMemo(() => links.filter(l => l.isPreferred).length, [links]);

  const displayedLinks = useMemo(() => {
    return links.filter(link => {
      if (filterTab === 'low') return isLow(link.variant);
      if (filterTab === 'preferred') return Boolean(link.isPreferred);
      return true;
    });
  }, [links, filterTab]);

  return (
    <div className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Panel Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Items We Buy Here</h3>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)'
              }}>
                {totalCount} item{totalCount === 1 ? '' : 's'}
              </span>
              {lowCount > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: 'var(--accent-warning)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertTriangle size={12} />
                  {lowCount} running low
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {totalCount === 0
                ? 'Nothing linked yet — raising a purchase order records items automatically.'
                : 'Products mapped to this supplier with negotiated purchase prices and warehouse stock levels.'}
            </p>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input-field"
              placeholder="Search items, SKU, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: search ? '30px' : '12px',
                fontSize: '13px',
                height: '36px',
                borderRadius: '8px'
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        {totalCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterTab('all')}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterTab === 'all' ? 'var(--accent-primary)' : 'var(--border-light)',
                backgroundColor: filterTab === 'all' ? 'var(--bg-hover)' : 'transparent',
                color: filterTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All Items ({totalCount})
            </button>
            {lowCount > 0 && (
              <button
                onClick={() => setFilterTab('low')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: filterTab === 'low' ? 'var(--accent-warning)' : 'var(--border-light)',
                  backgroundColor: filterTab === 'low' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  color: filterTab === 'low' ? 'var(--accent-warning)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <AlertTriangle size={12} />
                Running Low ({lowCount})
              </button>
            )}
            {preferredCount > 0 && (
              <button
                onClick={() => setFilterTab('preferred')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: filterTab === 'preferred' ? 'var(--accent-gold)' : 'var(--border-light)',
                  backgroundColor: filterTab === 'preferred' ? 'rgba(226, 193, 113, 0.12)' : 'transparent',
                  color: filterTab === 'preferred' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Star size={12} />
                Preferred ({preferredCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" />
            <span style={{ fontSize: '13px' }}>Loading supplier catalog...</span>
          </div>
        ) : displayedLinks.length === 0 ? (
          <div style={{ padding: '56px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <PackageSearch size={44} style={{ opacity: 0.25, marginBottom: '14px' }} />
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {search
                ? `No items match "${search}".`
                : filterTab === 'low'
                ? 'Great news! No items from this supplier are currently running low.'
                : filterTab === 'preferred'
                ? 'No items are marked with this supplier as preferred.'
                : <>No items are linked to {supplierName || 'this supplier'} yet.<br />They will appear here as soon as you raise a purchase order.</>}
            </p>
            {(search || filterTab !== 'all') && (
              <button
                className="btn-secondary"
                onClick={() => { setSearch(''); setFilterTab('all'); }}
                style={{ marginTop: '16px', fontSize: '12px', padding: '6px 14px' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto', border: 'none', borderRadius: 0, background: 'transparent' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border-light)' }}>
                <tr>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Item Details</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Their Code</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Their Price</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>In Stock</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Terms</th>
                  <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedLinks.map(link => {
                  const variant = link.variant || {};
                  const stock = stockOf(variant);
                  const low = isLow(variant);

                  return (
                    <tr
                      key={link.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.15s ease'
                      }}
                     
                      {...(variant.product?.id
                        ? rowLink(() => navigate(`/products/${variant.product.id}?tab=variants`), { label: `Open ${variant.product.title || 'product'}` })
                        : {})}
                    >
                      {/* Product details */}
                      <td style={{ padding: '14px 20px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            {variant.product?.title || 'Unknown product'}
                            {link.isPreferred && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                color: 'var(--accent-gold)',
                                background: 'rgba(226, 193, 113, 0.14)',
                                border: '1px solid rgba(226, 193, 113, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Star size={10} fill="currentColor" /> PREFERRED
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: '3px',
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center'
                          }}>
                            <span>{variant.sku}</span>
                            {variant.colorName && <span>· {variant.colorName}</span>}
                            {variant.size && <span>· {variant.size}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Supplier SKU */}
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {link.supplierSku ? (
                          <span style={{ background: 'var(--bg-input)', padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                            {link.supplierSku}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {formatMoney(link.costPrice) || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                      </td>

                      {/* Stock Level */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                          fontSize: '13px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: low ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                          color: low ? 'var(--accent-warning)' : 'var(--accent-success)',
                          border: `1px solid ${low ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`
                        }}>
                          {low && <AlertTriangle size={12} />}
                          {stock}
                        </span>
                      </td>

                      {/* Terms */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {[
                          link.leadTimeDays != null ? `${link.leadTimeDays}d lead` : null,
                          link.minOrderQty != null ? `min ${link.minOrderQty}` : null
                        ].filter(Boolean).join(' · ') || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {canOrder && (
                            <button
                              className="btn-primary"
                              disabled={!supplierIsActive}
                              title={!supplierIsActive
                                ? `${supplierName || 'This supplier'} is inactive -- reactivate them to order`
                                : `Create a purchase order to ${supplierName || 'this supplier'} for ${variant.sku || 'this item'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/inventory/purchase-orders/new', {
                                  state: {
                                    supplierId,
                                    variantId: variant.id,
                                    sku: variant.sku,
                                    variantCode: variant.variantCode || '',
                                    barcode: variant.barcode || '',
                                    title: variant.product?.title || '',
                                    color: variant.colorName || '',
                                    size: variant.size || '',
                                    orderedQty: link.minOrderQty || 1,
                                    costPrice: link.costPrice == null ? 0 : Number(link.costPrice),
                                    sellingPrice: sellingPriceOf(variant)
                                  }
                                });
                              }}
                              style={{
                                padding: '4px 9px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderRadius: '6px'
                              }}
                            >
                              <FileText size={13} />
                              <span>Order</span>
                            </button>
                          )}
                          {canEditLinks && !link.isPreferred && (
                            <button
                              className="btn-icon"
                              title="Make this our preferred supplier for this item"
                              disabled={setPreferred.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreferred.mutate(link.id);
                              }}
                              style={{ width: '30px', height: '30px' }}
                            >
                              <Star size={14} />
                            </button>
                          )}
                          {canEditLinks && (
                            <button
                              className="btn-icon"
                              title="Remove this item from the supplier"
                              disabled={unlink.isPending}
                              style={{ color: 'var(--accent-danger)', width: '30px', height: '30px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkToRemove({ id: link.id, sku: variant.sku });
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!linkToRemove}
        onClose={() => setLinkToRemove(null)}
        onConfirm={() => unlink.mutateAsync(linkToRemove.id)}
        title="Remove this item?"
        message={linkToRemove
          ? `${linkToRemove.sku} will no longer be listed as something you buy from ${supplierName || 'this supplier'}. The item itself is not affected.`
          : ''}
        confirmText="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}
