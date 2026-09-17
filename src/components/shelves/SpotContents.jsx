import React from 'react';
import { Link } from 'react-router-dom';
import { X, PackageOpen, ArrowRightLeft } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { kindLabel } from '../../hooks/useShelves';
import { SpotChip, ItemThumb, EmptyState, itemDetail, pieces } from './ShelfBits';

/** What is on one shelf: shown after a shelf label is scanned. */
export default function SpotContents({ data, onClose, onFind }) {
  const { can } = usePermission();
  const { spot, items, total, overCapacity } = data;
  return (
    <section className="sh-card" style={{ display: 'grid', gap: 14 }} aria-label={`Shelf ${spot.address}`}>
      <div className="sh-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span className="sh-muted">{kindLabel(spot.kind)} · {spot.location?.name}</span>
          <SpotChip address={spot.address} name={spot.name} colour={spot.colour} isShopFloor={spot.isShopFloor} size="lg" />
          <span className="sh-muted">
            {pieces(total)}{spot.capacity ? ` of about ${spot.capacity}` : ''}
            {overCapacity && <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}> · over capacity</span>}
            {!spot.active && <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}> · switched off</span>}
          </span>
        </div>
        <div className="sh-row" style={{ gap: 6 }}>
          {can('shelf:putaway') && spot.holdsStock && (
            <Link to={`/shelves/move?spot=${spot.id}`} className="btn-secondary" style={{ padding: '6px 10px', textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center' }}>
              <ArrowRightLeft size={14} /> Move from here
            </Link>
          )}
          {onClose && <button type="button" className="sh-iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button>}
        </div>
      </div>

      {!spot.holdsStock ? (
        <EmptyState icon={PackageOpen} title="This holds shelves, not stock" text="Scan one of the shelves or boxes inside it." />
      ) : items.length === 0 ? (
        <EmptyState icon={PackageOpen} title="Empty shelf" text="Nothing is recorded on this shelf." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(it => (
            <button key={it.variantId} type="button" className="sh-list-btn" style={{ border: '1px solid var(--border-light)' }}
              onClick={() => onFind?.(it)} title="Find everywhere this is kept">
              <ItemThumb url={it.imageUrl} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                <span className="sh-muted" style={{ display: 'block' }}>{itemDetail(it)}</span>
              </span>
              <span className="sh-big-qty" style={{ fontSize: 18 }}>{it.quantity}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
