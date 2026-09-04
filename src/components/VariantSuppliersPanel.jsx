import React from 'react';
import { Loader2, Star, Trash2, Phone, Truck, PackageCheck } from 'lucide-react';
import {
  useVariantSuppliers,
  useSetPreferredSupplier,
  useUnlinkSupplierProduct
} from '../hooks/useSuppliers';
import { toWhatsAppNumber } from '../utils/whatsappUtils';

/**
 * Answers "who do we buy this item from?" for one variant.
 *
 * There was no answer anywhere in the product before this: the supplier relationship existed
 * only inside purchase order history, so the only way to find a source was to remember it or
 * dig through past orders. Ordered cheapest-first under the preferred supplier, because the
 * two questions asked here are "who is our default" and "who is cheapest".
 */
const formatMoney = (value) =>
  value == null ? null : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function VariantSuppliersPanel({ variantId, sku }) {
  const { data: links = [], isLoading } = useVariantSuppliers(variantId);
  const setPreferred = useSetPreferredSupplier();
  const unlink = useUnlinkSupplierProduct();

  if (isLoading) {
    return (
      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Loader2 size={16} className="animate-spin" /> Loading suppliers...
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
        No supplier is recorded for {sku ? <code>{sku}</code> : 'this item'} yet.<br />
        Raising a purchase order for it will record the supplier automatically.
      </div>
    );
  }

  // Only meaningful once there is something to compare against, and only where prices are
  // actually known -- highlighting "cheapest" out of one is noise.
  const priced = links.filter(l => l.costPrice != null).map(l => Number(l.costPrice));
  const cheapest = priced.length > 1 ? Math.min(...priced) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {links.map(link => {
        const cost = link.costPrice == null ? null : Number(link.costPrice);
        const isCheapest = cheapest != null && cost === cheapest;
        const waNumber = toWhatsAppNumber(link.supplier?.phone);

        return (
          <div
            key={link.id}
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {link.supplier?.name}
                </span>
                {link.isPreferred && (
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '999px', color: 'var(--accent-gold)', background: 'rgba(226, 193, 113, 0.14)' }}>
                    PREFERRED
                  </span>
                )}
                {isCheapest && !link.isPreferred && (
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '999px', color: 'var(--accent-success)', background: 'rgba(16, 185, 129, 0.12)' }}>
                    CHEAPEST
                  </span>
                )}
                {link.supplier?.isActive === false && (
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '999px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}>
                    INACTIVE
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{link.supplier?.supplierCode}</span>
                {link.supplierSku && <span>their code: {link.supplierSku}</span>}
                {link.leadTimeDays != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={12} /> {link.leadTimeDays}d lead
                  </span>
                )}
                {link.minOrderQty != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <PackageCheck size={12} /> min {link.minOrderQty}
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '90px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: isCheapest ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                {formatMoney(cost) || '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>their price</div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon"
                  title={`Message ${link.supplier?.name} on WhatsApp`}
                  style={{ color: '#25D366', display: 'flex', alignItems: 'center' }}
                >
                  <Phone size={14} />
                </a>
              )}
              {!link.isPreferred && (
                <button
                  className="btn-icon"
                  title="Make this the preferred supplier for this item"
                  disabled={setPreferred.isPending}
                  onClick={() => setPreferred.mutate(link.id)}
                >
                  <Star size={14} />
                </button>
              )}
              <button
                className="btn-icon"
                title={`Remove ${link.supplier?.name} as a supplier of this item`}
                disabled={unlink.isPending}
                onClick={() => {
                  // Removing a source is not destructive to any order already placed, but it
                  // does change what gets suggested later, so it is confirmed.
                  if (window.confirm(`Remove ${link.supplier?.name} as a supplier of this item?`)) {
                    unlink.mutate(link.id);
                  }
                }}
                style={{ color: 'var(--accent-danger)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
