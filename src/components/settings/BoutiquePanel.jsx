import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/**
 * Settings → Boutique, shown only to a shop that uses the ScaleEzy Boutique (PLAN-boutique-sync.md). It tells the
 * owner what is connected and how it works; turning it on or off is ScaleEzy's job, so there is nothing to press.
 */
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function useBoutiqueLink(enabled = true) {
  return useQuery({ queryKey: ['boutique-link'], queryFn: async () => (await api.get('/boutique-link')).data, enabled, staleTime: 60_000, retry: 1 });
}

export default function BoutiquePanel() {
  const { data, isLoading } = useBoutiqueLink();
  if (isLoading || !data) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  if (!data.linked) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>This shop does not use the ScaleEzy Boutique.</div>;
  const row = { display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-light)', fontSize: 13.5 };
  return (
    <div style={{ display: 'grid', maxWidth: 760 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Boutique</h2>
      <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: 13 }}>
        Your ScaleEzy Boutique shares one stock with this shop and your online store.
      </p>
      <div style={row}><strong>Connected to</strong><span>{data.shopName || data.tenant} <span style={{ color: 'var(--text-muted)' }}>({data.tenant}) since {when(data.linkedAt)}</span></span></div>
      <div style={row}><strong>Boutique items</strong><span>Appear in Products with the boutique's prices. Change those prices in the boutique.</span></div>
      <div style={row}><strong>Materials</strong><span>Threads, linings and other items not for sale are under Products → Sale or material → Materials.</span></div>
      <div style={{ ...row, borderBottom: '1px solid var(--border-light)' }}><strong>Changes</strong><span>To disconnect the boutique, contact ScaleEzy.</span></div>
    </div>
  );
}
