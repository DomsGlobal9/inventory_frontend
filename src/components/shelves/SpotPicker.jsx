import React, { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { useSpotTree, kindLabel } from '../../hooks/useShelves';
import { SpotChip } from './ShelfBits';

/** Every spot of a tree that can hold stock (nothing inside it, switched on), in walking order. */
export function holdingSpots(tree) {
  const out = [];
  const walk = (nodes, trail) => {
    for (const n of nodes ?? []) {
      const path = [...trail, n];
      if (n.children?.length) walk(n.children, path);
      else if (n.active && path.every(p => p.active)) out.push({ ...n, trail: path.map(p => p.name).filter(Boolean).join(' › ') });
    }
  };
  walk(tree?.spots, []);
  return out;
}

/**
 * Choose a shelf by tapping or typing part of its address or name. For a person without a scanner,
 * or a shelf whose label has worn off.
 */
export default function SpotPicker({ locationId, value, onChange, exclude = [], maxHeight = 320, emptyText }) {
  const tree = useSpotTree(locationId);
  const [filter, setFilter] = useState('');
  const spots = useMemo(() => holdingSpots(tree.data).filter(s => !exclude.includes(s.id)), [tree.data, exclude]);
  const f = filter.trim().toUpperCase().replace(/\s+/g, '');
  const shown = f ? spots.filter(s => s.address.replace(/-/g, '').includes(f.replace(/-/g, '')) || (s.name ?? '').toUpperCase().includes(filter.trim().toUpperCase()) || (s.trail ?? '').toUpperCase().includes(filter.trim().toUpperCase())) : spots;

  if (tree.isLoading) return <div className="sh-muted">Loading shelves…</div>;
  if (spots.length === 0) return <div className="sh-muted">{emptyText ?? 'No shelves set up here yet.'}</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-field" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter: C2, R04, silk…" aria-label="Filter shelves" style={{ width: '100%', paddingLeft: 34 }} />
      </div>
      <div role="listbox" aria-label="Shelves" style={{ display: 'grid', gap: 4, maxHeight, overflowY: 'auto', paddingRight: 2 }}>
        {shown.length === 0 && <div className="sh-muted" style={{ padding: 8 }}>No shelf matches "{filter}".</div>}
        {shown.map(s => (
          <button key={s.id} type="button" role="option" aria-selected={value === s.id}
            className={`sh-list-btn${value === s.id ? ' selected' : ''}`} onClick={() => onChange(s)}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <SpotChip address={s.address} name={s.name} colour={s.colour} isShopFloor={s.isShopFloor} />
              <span className="sh-muted" style={{ display: 'block', fontSize: 12 }}>
                {kindLabel(s.kind)} · {s.pieces} {s.pieces === 1 ? 'piece' : 'pieces'}{s.capacity ? ` of ~${s.capacity}` : ''}
              </span>
            </span>
            {value === s.id && <Check size={18} />}
          </button>
        ))}
      </div>
    </div>
  );
}
