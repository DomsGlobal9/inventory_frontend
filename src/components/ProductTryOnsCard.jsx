import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * "Tried on" on a product's page: how often shoppers tried this garment on in the last 30 days, and
 * in which colours, next to how many of each colour sold.
 *
 * Counts only -- the owner wanted to know which pieces people want to see on themselves, not who.
 * Nothing at all for a garment nobody has tried on: most products never are, and a row of zeros is
 * clutter. Tries come from the QR on the tag, the online shop and the counter.
 */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function ProductTryOnsCard({ productId }) {
  const { data } = useQuery({
    queryKey: ['products', productId, 'try-ons'],
    queryFn: async () => (await api.get(`/products/${productId}/try-ons`)).data,
    enabled: !!productId,
    staleTime: 60_000,
    retry: false
  });
  if (!data || !data.triedOn) return null;

  const sold = data.byColour.reduce((n, c) => n + c.sold, 0);
  const where = [
    data.places.TAG && `${data.places.TAG} from the tag`,
    data.places.SHOP_PAGE && `${data.places.SHOP_PAGE} online`,
    data.places.COUNTER && `${data.places.COUNTER} at the counter`
  ].filter(Boolean).join(', ');
  const named = data.byColour.filter(c => c.colour);

  return (
    <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>Tried on</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          {plural(data.triedOn, 'time', 'times')} in the last {data.days} days ({where}). {plural(sold, 'piece', 'pieces')} of those colours sold in the same days.
        </div>
      </div>
      {named.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {named.map(c => (
            <span key={c.colour} style={{ fontSize: '12.5px', padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-secondary, rgba(0,0,0,0.04))', border: '1px solid var(--border-light)' }}>
              <strong style={{ fontWeight: 600 }}>{c.colour}</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>tried {c.triedOn} · sold {c.sold}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
