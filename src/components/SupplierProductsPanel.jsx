import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PackageSearch, Star, Trash2, AlertTriangle, FileText } from 'lucide-react';
import {
  useSupplierProducts,
  useSetPreferredSupplier,
  useUnlinkSupplierProduct
} from '../hooks/useSuppliers';
import ConfirmModal from './ConfirmModal';
import { usePermission } from '../hooks/usePermission';
import { useLocationContext } from '../contexts/LocationContext';

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

  /**
   * What this item actually sells for at the location currently selected.
   *
   * Same precedence the backend's resolveVariantForLocation uses, and the same one the
   * pricing column on the product page follows: a location's override, then the variant's
   * own price, then the product's base price. The last step is not a nicety -- adding a
   * product asks for one base price and never for a per-variant price, so most variants
   * are priced only at product level and would otherwise report no price at all.
   *
   * Carried into the purchase order so the form can warn about ordering at a loss.
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

  /**
   * When an item counts as low here.
   *
   * This must match inventory.service.ts, and for a while it did not. The rule there used to
   * be Math.max(reorderLevel || 0, 10) and was corrected -- a reorder level the merchant has
   * actually chosen is now honoured exactly, and ten is only the fallback for a variant that
   * has never been given one. This copy kept the old formula, under a comment promising the
   * two agreed, so a variant with a reorder level of 5 holding 7 pieces read "Healthy" on the
   * inventory screen and "running low" here -- one item, two answers, on screens a shopkeeper
   * reads minutes apart. Found by creating exactly that variant.
   *
   * A floor above the merchant's own setting makes the setting a suggestion, and a low-stock
   * badge on well-stocked items is how people learn to ignore the badge.
   */
  const DEFAULT_LOW_STOCK_THRESHOLD = 10;
  const isLow = (variant) => {
    const chosen = variant?.reorderLevel;
    const threshold = (chosen && chosen > 0) ? chosen : DEFAULT_LOW_STOCK_THRESHOLD;
    return stockOf(variant) <= threshold;
  };

  const lowCount = links.filter(l => isLow(l.variant)).length;

  return (
    <div className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Items We Buy Here</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {links.length === 0
                ? 'Nothing linked yet — raising a purchase order records items automatically.'
                : `${links.length} item${links.length === 1 ? '' : 's'}${lowCount ? ` · ${lowCount} running low` : ''}`}
            </p>
          </div>
          <input
            className="input-field"
            placeholder="Search these items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '240px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '48px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="table-container" style={{ padding: '56px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <PackageSearch size={44} style={{ opacity: 0.2, marginBottom: '14px' }} />
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {search
                ? `No items match "${search}".`
                : <>No items are linked to {supplierName || 'this supplier'} yet.<br />They will appear here as soon as you raise a purchase order.</>}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 10 }}>
              <tr>
                <th>Item</th>
                <th>Their Code</th>
                <th style={{ textAlign: 'right' }}>Their Price</th>
                <th style={{ textAlign: 'right' }}>In Stock</th>
                <th>Terms</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => {
                const variant = link.variant || {};
                const stock = stockOf(variant);
                const low = isLow(variant);

                return (
                  <tr key={link.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td>
                      <div
                        onClick={() => variant.product?.id && navigate(`/products/${variant.product.id}?tab=variants`)}
                        style={{ cursor: variant.product?.id ? 'pointer' : 'default' }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {variant.product?.title || 'Unknown product'}
                          {link.isPreferred && (
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '999px', color: 'var(--accent-gold)', background: 'rgba(226, 193, 113, 0.14)' }}>
                              PREFERRED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          {variant.sku}
                          {variant.colorName && ` · ${variant.colorName}`}
                          {variant.size && ` · ${variant.size}`}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {link.supplierSku || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {formatMoney(link.costPrice) || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontWeight: 500, color: low ? 'var(--accent-warning)' : 'var(--text-primary)'
                      }}>
                        {low && <AlertTriangle size={13} />}
                        {stock}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {[
                        link.leadTimeDays != null ? `${link.leadTimeDays}d lead` : null,
                        link.minOrderQty != null ? `min ${link.minOrderQty}` : null
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        {/*
                          The mirror of the Create PO button on the product page's supplier
                          list. Both screens show the same supplier-and-item pair; only one
                          of them could act on it, so arriving here with "order 50 of that
                          from him" meant walking to the product, finding the variant,
                          opening its supplier list and finding this supplier again.

                          Same rules as the other side deliberately: this supplier's own
                          negotiated price rather than the product's cost, their minimum
                          order quantity where they have one, and no one-click order to a
                          supplier who has been switched off.
                        */}
                        {canOrder && (
                          <button
                            className="btn-icon"
                            disabled={!supplierIsActive}
                            title={!supplierIsActive
                              ? `${supplierName || 'This supplier'} is inactive -- reactivate them to order`
                              : `Create a purchase order to ${supplierName || 'this supplier'} for ${variant.sku || 'this item'}`}
                            onClick={() => navigate('/inventory/purchase-orders/new', {
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
                            })}
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        {!link.isPreferred && (
                          <button
                            className="btn-icon"
                            title="Make this our preferred supplier for this item"
                            disabled={setPreferred.isPending}
                            onClick={() => setPreferred.mutate(link.id)}
                          >
                            <Star size={14} />
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          title="Remove this item from the supplier"
                          disabled={unlink.isPending}
                          style={{ color: 'var(--accent-danger)' }}
                          onClick={() => setLinkToRemove({ id: link.id, sku: variant.sku })}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
