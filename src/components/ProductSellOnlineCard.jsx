import React from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProduct } from '../hooks/useProducts';

/**
 * "Where it is sold" on a product's page (PLAN-sell-online.md, 26 Nov 2026): till and online, or till only.
 * Online = our online shop, reel links, other websites and Shopify. A draft or a material has no choice yet, so the
 * card says why instead of offering one.
 */
export default function ProductSellOnlineCard({ product, canEdit }) {
  const update = useUpdateProduct();
  const queryClient = useQueryClient();
  const saved = product.sellOnline !== false;
  // While the save is on its way (a few seconds on the live server), the choice shows at once and says so.
  const [pending, setPending] = React.useState(null);
  const online = pending ?? saved;
  const blocked = product.sellInShop === false
    ? 'A material: counted and used, not sold anywhere.'
    : product.status !== 'ACTIVE' ? 'Not published yet. Once published it sells at the till, and online unless you choose till only.' : null;

  // The same rule as "Sell online" in bulk: a product goes online only with a photo (a blank card sells nothing).
  const photographed = (product.variantSummary?.variantCount || 0) - (product.variantSummary?.variantsWithoutImages || 0);
  const hasPhoto = product.imageCount > 0 || photographed > 0;
  const needsPhoto = !saved && !hasPhoto;

  const choose = (on) => {
    if (on === online || update.isPending || (on && needsPhoto)) return;
    setPending(on);
    update.mutate({ id: product.id, data: { sellOnline: on } }, {
      onSettled: () => setPending(null),
      onSuccess: () => {
        toast.success(on ? 'Now sold at the till and online.' : 'Now till only. It has left your online shop and websites.');
        queryClient.invalidateQueries({ predicate: q => JSON.stringify(q.queryKey).toLowerCase().includes('shopify') });
      }
    });
  };

  const Row = ({ on, title, sub, off = false }) => {
    const picked = online === on;
    return (
      <button type="button" role="radio" aria-checked={picked} disabled={!canEdit || update.isPending || off} onClick={() => choose(on)}
        style={{ opacity: off ? 0.55 : 1, display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--border-light)', padding: '10px 0', cursor: canEdit ? 'pointer' : 'default', color: 'inherit', font: 'inherit' }}>
        <span aria-hidden="true" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid var(--accent-primary)', marginTop: '2px', flex: 'none', background: picked ? 'var(--accent-primary)' : 'transparent', boxShadow: picked ? 'inset 0 0 0 3px var(--bg-card, #fff)' : 'none' }} />
        <span>
          <span style={{ display: 'block', fontSize: '14px', fontWeight: 500 }}>{title}</span>
          <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)' }}>{sub}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '14px 20px', flexShrink: 0 }}>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: blocked ? '4px' : '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Where it is sold
        {update.isPending && <span role="status" style={{ fontWeight: 400, fontSize: '12.5px', color: 'var(--text-secondary)' }}>Saving…</span>}
      </div>
      {blocked ? (
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{blocked}</div>
      ) : (
        <div role="radiogroup" aria-label="Where it is sold">
          <Row on off={needsPhoto} title="Till and online"
            sub={needsPhoto ? 'Add a photo first (Images tab): online, a product without one shows as a blank card.' : 'The counter, your online shop, reel links, other websites and Shopify.'} />
          <Row on={false} title="Till only" sub="Hidden online. Still sells at the counter." />
        </div>
      )}
    </div>
  );
}
