import React, { useMemo, useState } from 'react';
import { Map as MapIcon, Loader2, Search } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { useDebounced } from '../../hooks/useCounterSale';
import { useSpotTree, useShelfFind, useSpot, kindLabel } from '../../hooks/useShelves';
import { ShelvesLayout, ScanInput, EmptyState } from '../../components/shelves/ShelfBits';
import SpotContents from '../../components/shelves/SpotContents';

/**
 * The shop at a glance: each area, its racks and cupboards side by side in walking order, and their
 * shelves as cells. Type an item and the cells holding it light up with how many are there.
 */
export default function RackMap() {
  const { currentLocation } = useLocationContext();
  const locationId = currentLocation?.id;
  const tree = useSpotTree(locationId);
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const find = useShelfFind(q, locationId);
  const [openSpot, setOpenSpot] = useState(null);
  const spot = useSpot(openSpot);

  // spotId -> pieces of the searched items there
  const lit = useMemo(() => {
    const m = new Map();
    for (const item of find.data?.items ?? []) {
      for (const place of item.places ?? []) for (const s of place.shelves) m.set(s.spotId, (m.get(s.spotId) ?? 0) + s.quantity);
    }
    return q ? m : new Map();
  }, [find.data, q]);
  const max = Math.max(1, ...[...(tree.data?.spots ?? [])].flatMap(function all(n) { return [n.pieces ?? 0, ...(n.children ?? []).flatMap(all)]; }));

  return (
    <ShelvesLayout title="Rack map" icon={MapIcon} subtitle="Every area and rack in walking order. Search to light up where something is.">
      <div className="sh-card" style={{ display: 'grid', gap: 10 }}>
        <ScanInput value={text} onChange={setText} busy={find.isFetching} placeholder="Type or scan an item to light up its shelves" label="Search the map" />
        {q && <span className="sh-muted">{lit.size ? `Found on ${lit.size} ${lit.size === 1 ? 'shelf' : 'shelves'}.` : find.isFetching ? 'Searching…' : `Not on any shelf here.`}</span>}
      </div>

      {tree.isLoading ? <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        : !tree.data?.spots?.length ? <div className="sh-card"><EmptyState icon={MapIcon} title="No racks or shelves here yet" text="Set them up under Racks & shelves." /></div>
        : (
          <div style={{ display: 'grid', gap: 16 }}>
            {tree.data.spots.map(area => (
              <section key={area.id} className="sh-card" style={{ display: 'grid', gap: 12, opacity: area.active ? 1 : 0.5 }}>
                <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <span className="sh-row" style={{ gap: 8 }}>
                    <span className="sh-addr" style={{ fontSize: 18 }}>{area.address}</span>
                    {area.name && <span className="sh-muted">{area.name}</span>}
                    <span className={`sh-tag ${area.isShopFloor ? 'floor' : 'back'}`}>{area.isShopFloor ? 'Shop floor' : 'Back room'}</span>
                  </span>
                  <span className="sh-muted">{area.branchPieces} pieces</span>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
                  {(area.children?.length ? area.children : [area]).map(unit => (
                    <Unit key={unit.id} unit={unit} lit={lit} max={max} onOpen={setOpenSpot} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      {openSpot && spot.data && (
        <div role="dialog" aria-modal="true" onClick={() => setOpenSpot(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}>
            <SpotContents data={spot.data} onClose={() => setOpenSpot(null)} onFind={(it) => { setOpenSpot(null); setText(it.sku); }} />
          </div>
        </div>
      )}
    </ShelvesLayout>
  );
}

/** A rack or cupboard: its shelves stacked top to bottom as cells, boxes inside a shelf side by side. */
function Unit({ unit, lit, max, onOpen }) {
  const rows = unit.children?.length ? unit.children : [unit];
  return (
    <div style={{ minWidth: 150, flex: '0 0 auto', display: 'grid', gap: 6, alignContent: 'start', border: '1px solid var(--border-light)', borderRadius: 12, padding: 8, background: 'var(--bg-input)', opacity: unit.active ? 1 : 0.5 }}>
      <div className="sh-row" style={{ gap: 6, justifyContent: 'space-between' }}>
        <span className="sh-row" style={{ gap: 6, minWidth: 0 }}>
          {unit.colour && <span className="sh-dot" style={{ background: unit.colour }} />}
          <span className="sh-addr" style={{ fontSize: 13 }}>{unit.code}</span>
        </span>
        <span className="sh-muted" style={{ fontSize: 11 }}>{unit.name || kindLabel(unit.kind)}</span>
      </div>
      {rows.map(row => (
        <div key={row.id} style={{ display: 'flex', gap: 4 }}>
          {(row.children?.length ? row.children : [row]).map(cell => <Cell key={cell.id} cell={cell} lit={lit} max={max} onOpen={onOpen} label={row.children?.length ? `${row.code}-${cell.code}` : cell.code} />)}
        </div>
      ))}
    </div>
  );
}

function Cell({ cell, lit, max, onOpen, label }) {
  const here = lit.get(cell.id);
  const holds = cell.branchPieces ?? cell.pieces ?? 0;
  const fill = Math.min(1, holds / max);
  return (
    <button type="button" onClick={() => onOpen(cell.children?.length ? null : cell.id)} title={`${cell.address}${cell.name ? ` — ${cell.name}` : ''}: ${holds} pieces`}
      style={{
        flex: 1, minWidth: 44, minHeight: 44, borderRadius: 8, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4,
        border: here ? '2px solid var(--accent-success)' : '1px solid var(--border-light)',
        background: here ? 'rgba(16,185,129,.22)' : `color-mix(in srgb, var(--text-primary) ${Math.round(fill * 12)}%, var(--bg-card))`,
        color: 'var(--text-primary)', opacity: cell.active ? 1 : 0.4, boxShadow: here ? '0 0 0 3px rgba(16,185,129,.18)' : 'none'
      }}>
      <span className="sh-addr" style={{ fontSize: 11 }}>{label}</span>
      <span style={{ fontSize: here ? 15 : 11, fontWeight: here ? 800 : 500, color: here ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{here ?? (holds || '·')}</span>
    </button>
  );
}
