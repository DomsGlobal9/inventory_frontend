import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PackageSearch, Star, Trash2, AlertTriangle } from 'lucide-react';
import {
  useSupplierProducts,
  useSetPreferredSupplier,
  useUnlinkSupplierProduct
} from '../hooks/useSuppliers';

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

export default function SupplierProductsPanel({ supplierId, supplierName }) {
  const [search, setSearch] = useState('');
  const { data: links = [], isLoading } = useSupplierProducts(supplierId, search || undefined);
  const setPreferred = useSetPreferredSupplier();
  const unlink = useUnlinkSupplierProduct();
  const navigate = useNavigate();

  const stockOf = (variant) =>
    (variant?.stocks || []).reduce((sum, s) => sum + (s.quantity || 0), 0);

  // Same threshold the inventory badge uses, so an item does not read "low" on one screen
  // and "healthy" on another.
  const isLow = (variant) => stockOf(variant) <= Math.max(variant?.reorderLevel ?? 0, 10);

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
          <div style={{ padding: '56px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                          onClick={() => {
                            if (window.confirm(`Remove ${variant.sku} from ${supplierName || 'this supplier'}?`)) {
                              unlink.mutate(link.id);
                            }
                          }}
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
    </div>
  );
}
