import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, MapPinned, PackageOpen, Warehouse, ArrowRightLeft } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useDebounced } from '../../hooks/useCounterSale';
import { useShelfFind, isLabelScan, looksLikeAddress, resolveSpot } from '../../hooks/useShelves';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, itemDetail, pieces } from '../../components/shelves/ShelfBits';
import SpotContents from '../../components/shelves/SpotContents';

/**
 * "Where is it?" -- for anyone on the floor with a customer waiting. Scan the tag, type a name, or scan a
 * shelf label to see what is on it. The answer is the shelf address in large type, shop floor first,
 * in the order you walk the shop.
 */
export default function WhereIsIt() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const navigate = useNavigate();
  // Opened from a product ("Where is it?" link) with ?q=SKU.
  const [text, setText] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const [allLocations, setAllLocations] = useState(false);
  const [spot, setSpot] = useState(null);
  const [resolving, setResolving] = useState(false);
  const locationId = allLocations ? null : currentLocation?.id;
  const q = useDebounced(text.trim(), 250);
  const searchable = q && !isLabelScan(q);
  const find = useShelfFind(searchable ? q : '', locationId);
  const items = searchable ? (find.data?.items ?? []) : [];

  const submit = async (typed) => {
    if (isLabelScan(typed) || (looksLikeAddress(typed) && !items.length)) {
      setResolving(true);
      try {
        const found = await resolveSpot(typed, currentLocation?.id);
        setSpot(found);
        setText('');
      } catch (err) {
        if (isLabelScan(typed)) toast.error(err?.message || 'No shelf matches that label.');
      } finally {
        setResolving(false);
      }
    }
  };

  return (
    <ShelvesLayout
      title="Where is it?"
      icon={MapPinned}
      subtitle="Scan a price tag or type a name to find the shelf. Scan a shelf label to see what is on it."
    >
      <div className="sh-card" style={{ display: 'grid', gap: 12 }}>
        <ScanInput
          value={text}
          onChange={(v) => { setText(v); if (v) setSpot(null); }}
          onSubmit={submit}
          busy={find.isFetching || resolving}
          placeholder="Scan a tag or shelf label, or type saree, SKU, colour…"
        />
        <label className="sh-row sh-muted" style={{ gap: 8, cursor: 'pointer', width: 'fit-content' }}>
          <input type="checkbox" checked={allLocations} onChange={(e) => setAllLocations(e.target.checked)} />
          Look in every location, not just {currentLocation?.name ?? 'this one'}
        </label>
      </div>

      {spot ? (
        <SpotContents data={spot} onClose={() => setSpot(null)} onFind={(variant) => { setSpot(null); setText(variant.sku); }} />
      ) : !q ? (
        <div className="sh-card">
          <EmptyState icon={Search} title="Find any piece in seconds"
            text="Point the scanner at the price tag, or start typing. You will see every shelf holding it, with the shop floor first." />
        </div>
      ) : find.isLoading ? (
        <div className="sh-card"><EmptyState icon={Search} title="Searching…" /></div>
      ) : items.length === 0 ? (
        <div className="sh-card">
          <EmptyState icon={PackageOpen} title={`Nothing matches "${q}"`}
            text="Check the spelling, try the SKU or colour, or scan the tag." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {items.map(item => <ItemResult key={item.variantId} item={item} canMove={can('shelf:putaway')} navigate={navigate} />)}
        </div>
      )}
    </ShelvesLayout>
  );
}

function ItemResult({ item, canMove, navigate }) {
  const places = item.places ?? [];
  return (
    <article className="sh-card" style={{ display: 'grid', gap: 14 }}>
      <div className="sh-row" style={{ alignItems: 'flex-start' }}>
        <ItemThumb url={item.imageUrl} size={72} label={item.title} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{item.title}</div>
          <div className="sh-muted">{itemDetail(item)}</div>
          {item.archived && <span className="sh-tag muted" style={{ marginTop: 6, display: 'inline-block' }}>Archived product</span>}
        </div>
      </div>

      {places.length === 0 ? (
        <div className="sh-muted" style={{ padding: '4px 2px' }}>None in stock {places.length === 0 ? 'here' : ''}.</div>
      ) : places.map(place => (
        <div key={place.locationId} style={{ display: 'grid', gap: 8 }}>
          <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span className="sh-row" style={{ gap: 8 }}><Warehouse size={16} /> <strong>{place.location}</strong></span>
            <span className="sh-muted">{pieces(place.total)} here{place.held ? ` · ${place.held} held for orders` : ''}</span>
          </div>

          {place.shelves.map((s, i) => (
            <div key={s.spotId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              padding: '12px 14px', borderRadius: 12,
              background: i === 0 && s.isShopFloor ? 'rgba(16,185,129,.08)' : 'var(--bg-input)',
              border: `1px solid ${i === 0 && s.isShopFloor ? 'rgba(16,185,129,.35)' : 'var(--border-light)'}`
            }}>
              <SpotChip address={s.address} name={s.name} colour={s.colour} isShopFloor={s.isShopFloor} size="lg" />
              <span className="sh-row" style={{ gap: 10 }}>
                <span className="sh-big-qty">{s.quantity}</span>
                {canMove && (
                  <button type="button" className="btn-secondary" style={{ padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center' }}
                    onClick={() => navigate(`/shelves/move?spot=${s.spotId}&variant=${item.variantId}`)}>
                    <ArrowRightLeft size={14} /> Move
                  </button>
                )}
              </span>
            </div>
          ))}

          {place.notShelved > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 12, border: '1px dashed var(--border-focus)' }}>
              <span>
                <strong>Not shelved</strong>
                <span className="sh-muted"> · {place.usesShelves ? 'not put on a shelf yet' : 'this location has no shelves set up'}</span>
              </span>
              <span className="sh-row" style={{ gap: 10 }}>
                <span className="sh-big-qty" style={{ fontSize: 18 }}>{place.notShelved}</span>
                {canMove && place.usesShelves && (
                  <Link to={`/shelves/put-away?variant=${item.variantId}`} className="btn-secondary" style={{ padding: '6px 10px', textDecoration: 'none' }}>Put away</Link>
                )}
              </span>
            </div>
          )}
        </div>
      ))}
    </article>
  );
}
