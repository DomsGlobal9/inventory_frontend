import React from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useProductShopify, useSetProductOnShopify } from '../hooks/useShopify';

/**
 * The "On Shopify" switch on a product's page.
 *
 * Nothing at all when no Shopify store is connected -- most shops never connect one, and a switch
 * that cannot do anything is clutter. A product the shop built by hand in Shopify and matched by
 * SKU shows that instead of a switch: it is already there, and only its price and stock follow us.
 */
const ago = (when) => {
  if (!when) return null;
  const mins = Math.round((Date.now() - new Date(when).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
};

export default function ProductShopifyCard({ productId, canEdit, isService }) {
  const { data } = useProductShopify(productId);
  const setOn = useSetProductOnShopify(productId);
  if (!data) return null;

  const matched = data.origin === 'MATCHED';
  const on = !!data.on;
  const adminUrl = data.shopifyProductId ? `https://${data.shopDomain}/admin/products/${data.shopifyProductId}` : null;

  let line;
  if (matched) line = 'Made by hand in Shopify and matched by item code. Its price and stock follow this product; its title and photos stay as written in Shopify.';
  else if (!on) line = isService ? 'Services such as stitching are not sent to Shopify.' : 'Not on Shopify. Switch on to put it there with its photos, sizes, price and stock.';
  else if (data.status === 'FAILED') line = data.problem || 'Shopify did not accept it.';
  else if (data.status === 'PENDING') line = 'Sending to Shopify…';
  else line = `Title, photos, sizes, price and stock are kept in step.${data.lastSyncedAt ? ` Last sent ${ago(data.lastSyncedAt)}.` : ''}`;

  return (
    <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>On Shopify</div>
        <div style={{ fontSize: '12.5px', color: data.status === 'FAILED' && on ? 'var(--accent-danger)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {on && data.status === 'PENDING' && <Loader2 size={13} className="animate-spin" />}
          <span>{line}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        {adminUrl && (on || matched) && (
          <a href={adminUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            View in Shopify <ExternalLink size={13} />
          </a>
        )}
        {!matched && !isService && (canEdit ? (
          <button type="button" role="switch" aria-checked={on} aria-label="On Shopify" disabled={setOn.isPending} onClick={() => setOn.mutate(!on)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: on ? 'var(--accent-success, #16a34a)' : 'var(--text-secondary)' }}>
            {on ? 'On' : 'Off'}
            <span aria-hidden="true" style={{ width: '36px', height: '20px', borderRadius: '10px', position: 'relative', background: on ? 'var(--accent-success, #16a34a)' : 'var(--border-light)', transition: 'background .15s' }}>
              <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
            </span>
          </button>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{on ? 'On' : 'Off'}</span>
        ))}
      </div>
    </div>
  );
}
