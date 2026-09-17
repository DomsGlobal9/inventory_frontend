import React from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, MapPinned } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useNotShelved, useShelvesUsed } from '../../hooks/useShelves';

/**
 * Small shelf panels for other screens: "these are waiting to be put away" after goods arrive, and
 * "taken from these shelves" on an order.
 */

/** After a receipt, a return or a transfer: the pieces from it that are not on a shelf yet, here. */
/**
 * `quantities` is how many of each item this receipt or return brought in ({ variantId: n }). The notice
 * counts at most that many, so "3 pieces of this return" never includes stock that was already waiting.
 */
export function PutAwayNotice({ locationId, variantIds, quantities, what = 'these goods' }) {
  const { can } = usePermission();
  const allowed = can('shelf:putaway');
  const list = useNotShelved(allowed ? locationId : null, 1);
  if (!allowed || !list.data?.usesShelves) return null;
  const wanted = new Set(variantIds ?? []);
  const waiting = (list.data.items ?? []).filter(i => wanted.size === 0 || wanted.has(i.variantId));
  const pieces = waiting.reduce((t, i) => t + (quantities?.[i.variantId] !== undefined ? Math.min(i.notShelved, quantities[i.variantId]) : i.notShelved), 0);
  if (pieces === 0) return null;
  const params = wanted.size ? `?variants=${[...wanted].join(',')}` : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.08)' }}>
      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <PackagePlus size={18} />
        <span><strong>{pieces} {pieces === 1 ? 'piece' : 'pieces'}</strong> of {what} {pieces === 1 ? 'is' : 'are'} not on a shelf yet at {list.data.location?.name}.</span>
      </span>
      <Link to={`/shelves/put-away${params}`} className="btn-secondary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>Put away</Link>
    </div>
  );
}

/** On an order: the shelves its dispatched pieces came off. */
export function ShelvesUsed({ orderId }) {
  const { can } = usePermission();
  const allowed = can('shelf:view');
  const used = useShelvesUsed('ORDER', orderId, allowed);
  const rows = used.data ?? [];
  if (!allowed || rows.length === 0) return null;
  const byItem = new Map();
  for (const r of rows) {
    const key = r.variantId;
    const entry = byItem.get(key) ?? { title: r.title, sku: r.sku, legs: new Map() };
    for (const l of r.legs) entry.legs.set(l.address, (entry.legs.get(l.address) ?? 0) + l.quantity);
    byItem.set(key, entry);
  }
  return (
    <div className="card" style={{ padding: 20, display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}><MapPinned size={18} /> Taken from shelves</h3>
      {[...byItem.entries()].map(([variantId, it]) => (
        <div key={variantId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
          <span style={{ minWidth: 0 }}>{it.title} <span style={{ color: 'var(--text-secondary)' }}>{it.sku}</span></span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...it.legs.entries()].filter(([, q]) => q !== 0).map(([address, q]) => (
              <span key={address} style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                {address} · {Math.abs(q)}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
