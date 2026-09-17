import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PackagePlus, PackageCheck, Settings2, ScanLine, CheckCircle2, Loader2 } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useNotShelved, useWhereIs, usePutAway, useSpotTree, isLabelScan, looksLikeAddress, resolveSpot } from '../../hooks/useShelves';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, Stepper, itemDetail, pieces } from '../../components/shelves/ShelfBits';
import SpotPicker, { holdingSpots } from '../../components/shelves/SpotPicker';

/**
 * Put away: pieces that are in the location but on no shelf yet -- new stock, returns, a transfer in.
 *
 * Built for a scanner in one hand: scan the item's tag, scan the shelf label, Enter. The shelf it
 * already sits on is suggested first, so a restock lands next to its twins.
 */
export default function PutAway() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const list = useNotShelved(locationId, page);
  const tree = useSpotTree(locationId);
  const [text, setText] = useState('');
  const [selectedId, setSelectedId] = useState(params.get('variant'));
  const scanRef = useRef(null);

  // Opened from a receipt or a return with ?variants=a,b: just those, until the filter is cleared.
  const [onlyVariants, setOnlyVariants] = useState(() => (params.get('variants') ?? '').split(',').filter(Boolean));
  const items = (list.data?.items ?? []).filter(i => onlyVariants.length === 0 || onlyVariants.includes(i.variantId));
  const f = text.trim().toLowerCase();
  const filtered = f && !isLabelScan(f) ? items.filter(i => [i.title, i.sku, i.code, i.barcode, i.colorName, i.size].some(v => (v ?? '').toLowerCase().includes(f))) : items;

  useEffect(() => { setPage(1); }, [locationId]);

  const selectItem = (variantId) => {
    setSelectedId(variantId);
    setParams(variantId ? { variant: variantId } : {}, { replace: true });
  };

  const submitScan = (typed) => {
    const exact = items.find(i => [i.barcode, i.sku, i.code].some(v => v && v.toLowerCase() === typed.toLowerCase()));
    if (exact) { selectItem(exact.variantId); setText(''); return; }
    if (filtered.length === 1) { selectItem(filtered[0].variantId); setText(''); return; }
    if (isLabelScan(typed)) toast.error('Scan the item first, then the shelf.');
    else if (filtered.length === 0) toast.error(`"${typed}" is not waiting to be put away here.`);
  };

  if (!can('shelf:putaway')) {
    return <ShelvesLayout title="Put away" icon={PackagePlus}><div className="sh-card"><EmptyState icon={PackagePlus} title="You cannot put stock away" text="Ask whoever manages your team for the permission to put stock away and move it between shelves." /></div></ShelvesLayout>;
  }

  const noShelves = list.data && list.data.usesShelves === false;

  return (
    <ShelvesLayout title="Put away" icon={PackagePlus} subtitle="Pieces that are here but not on a shelf yet. Scan the tag, then the shelf label.">
      {noShelves ? (
        <div className="sh-card">
          <EmptyState icon={Settings2} title={`No shelves at ${currentLocation?.name}`}
            text="Set up the racks and shelves for this location first. Until then everything here counts as not shelved."
            action={can('shelf:manage') ? <Link to="/shelves/setup" className="btn-primary" style={{ textDecoration: 'none' }}>Set up racks & shelves</Link> : null} />
        </div>
      ) : (
        <div className="sh-split">
          <section className="sh-card" style={{ display: 'grid', gap: 12 }} aria-label="Waiting to be put away">
            <ScanInput ref={scanRef} value={text} onChange={setText} onSubmit={submitScan} placeholder="Scan the tag or filter…" busy={list.isFetching} />
            <div className="sh-row" style={{ justifyContent: 'space-between' }}>
              <h2 className="sh-section-title" style={{ margin: 0 }}>Waiting to be put away</h2>
              <span className="sh-muted">{list.data?.total ?? 0} {list.data?.total === 1 ? 'item' : 'items'}</span>
            </div>
            {onlyVariants.length > 0 && (
              <div className="sh-row" style={{ justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'var(--bg-input)' }}>
                <span className="sh-muted">Showing only what just arrived</span>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setOnlyVariants([])}>Show everything</button>
              </div>
            )}
            {list.isLoading ? <div className="sh-muted">Loading…</div>
              : items.length === 0 ? <EmptyState icon={PackageCheck} title="Everything is on a shelf" text="New stock, returns and transfers into this location will appear here." />
              : (
                <div style={{ display: 'grid', gap: 4, maxHeight: 'min(62vh, 640px)', overflowY: 'auto' }}>
                  {filtered.map(i => (
                    <button key={i.variantId} type="button" className={`sh-list-btn${selectedId === i.variantId ? ' selected' : ''}`} onClick={() => selectItem(i.variantId)}>
                      <ItemThumb url={i.imageUrl} size={44} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
                        <span className="sh-muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemDetail(i)}</span>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span className="sh-big-qty" style={{ fontSize: 18, display: 'block' }}>{i.notShelved}</span>
                        <span className="sh-muted" style={{ fontSize: 11 }}>of {i.total}</span>
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 && <div className="sh-muted" style={{ padding: 8 }}>Nothing waiting matches "{text}".</div>}
                </div>
              )}
            {(list.data?.pages ?? 1) > 1 && (
              <div className="sh-row" style={{ justifyContent: 'space-between' }}>
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="sh-muted">Page {page} of {list.data.pages}</span>
                <button className="btn-secondary" disabled={page >= list.data.pages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </section>

          <section aria-label="Put this away">
            {selectedId ? (
              <PutAwayPanel key={selectedId} variantId={selectedId} locationId={locationId} hasSpots={holdingSpots(tree.data).length > 0}
                onDone={(left) => { if (left === 0) { selectItem(null); setText(''); setTimeout(() => scanRef.current?.focus(), 50); } }} />
            ) : (
              <div className="sh-card">
                <EmptyState icon={ScanLine} title="Scan or choose an item" text="Pick something from the list on the left, or scan its price tag." />
              </div>
            )}
          </section>
        </div>
      )}
    </ShelvesLayout>
  );
}

function PutAwayPanel({ variantId, locationId, onDone, hasSpots }) {
  const where = useWhereIs(variantId, locationId);
  const put = usePutAway();
  const place = where.data?.places?.[0];
  const waiting = place?.notShelved ?? 0;
  const [quantity, setQuantity] = useState(1);
  const [spot, setSpot] = useState(null);
  const [scan, setScan] = useState('');
  const [resolving, setResolving] = useState(false);
  const shelfScanRef = useRef(null);

  useEffect(() => { if (waiting > 0) setQuantity(q => Math.min(Math.max(q, waiting), waiting)); }, [waiting]);
  // The next thing a scanner does is read a shelf label, so the cursor waits there once the item is shown.
  const ready = !where.isLoading && waiting > 0 && hasSpots;
  useEffect(() => { if (ready) setTimeout(() => shelfScanRef.current?.focus(), 60); }, [ready]);
  // Where its twins already are: shop floor first, in walking order (the server's order).
  const suggestions = useMemo(() => place?.shelves ?? [], [place]);
  useEffect(() => { if (!spot && suggestions[0]) setSpot({ id: suggestions[0].spotId, address: suggestions[0].address, name: suggestions[0].name, colour: suggestions[0].colour, isShopFloor: suggestions[0].isShopFloor }); }, [suggestions, spot]);

  const scanShelf = async (typed) => {
    if (!isLabelScan(typed) && !looksLikeAddress(typed)) { toast.error('That is not a shelf label. Scan the label on the shelf.'); return; }
    setResolving(true);
    try {
      const found = await resolveSpot(typed, locationId);
      if (found.spot.location?.id !== locationId) toast.error(`${found.spot.address} is in ${found.spot.location?.name}, not here.`);
      else if (!found.spot.holdsStock) toast.error(`${found.spot.address} has shelves inside it. Scan one of those.`);
      else if (!found.spot.active) toast.error(`${found.spot.address} is switched off.`);
      else { setSpot(found.spot); setScan(''); return confirm(found.spot); }
    } catch (err) {
      toast.error(err?.message || 'No shelf matches that label.');
    } finally {
      setResolving(false);
    }
  };

  const confirm = (target = spot) => {
    if (!target || put.isPending || quantity < 1 || quantity > waiting) return;
    put.mutate({ locationId, variantId, spotId: target.id, quantity }, {
      onSuccess: () => { onDone?.(waiting - quantity); setSpot(null); }
    });
  };

  if (where.isLoading) return <div className="sh-card"><div className="sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div></div>;
  if (!where.data) return <div className="sh-card"><EmptyState title="Item not found" /></div>;

  const item = where.data;
  return (
    <div className="sh-card" style={{ display: 'grid', gap: 16 }}>
      <div className="sh-row" style={{ alignItems: 'flex-start' }}>
        <ItemThumb url={item.imageUrl} size={80} label={item.title} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{item.title}</div>
          <div className="sh-muted">{itemDetail(item)}</div>
          <div style={{ marginTop: 6 }}><strong>{pieces(waiting)}</strong> <span className="sh-muted">not on a shelf · {place?.total ?? 0} here in all</span></div>
        </div>
      </div>

      {waiting === 0 ? (
        <EmptyState icon={CheckCircle2} title="All put away" text="Every piece of this item here is on a shelf." />
      ) : !hasSpots ? (
        <EmptyState title="No shelves to put it on" text="Set up racks and shelves for this location first." />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            <h3 className="sh-section-title">1 · How many</h3>
            <div className="sh-row" style={{ flexWrap: 'wrap' }}>
              <Stepper value={quantity} onChange={setQuantity} min={1} max={waiting} />
              {quantity !== waiting && <button type="button" className="btn-secondary" onClick={() => setQuantity(waiting)}>All {waiting}</button>}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <h3 className="sh-section-title">2 · Scan the shelf label</h3>
            <ScanInput ref={shelfScanRef} value={scan} onChange={setScan} onSubmit={scanShelf} busy={resolving || put.isPending} autoFocus={false}
              placeholder="Scan the shelf label — it saves straight away" label="Scan the shelf label" />
          </div>

          {suggestions.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              <h3 className="sh-section-title">Already kept on</h3>
              {suggestions.map(s => (
                <button key={s.spotId} type="button" className={`sh-list-btn${spot?.id === s.spotId ? ' selected' : ''}`} style={{ border: '1px solid var(--border-light)' }}
                  onClick={() => setSpot({ id: s.spotId, address: s.address, name: s.name, colour: s.colour, isShopFloor: s.isShopFloor })}>
                  <span style={{ flex: 1 }}><SpotChip address={s.address} name={s.name} colour={s.colour} isShopFloor={s.isShopFloor} /></span>
                  <span className="sh-muted">{s.quantity} there</span>
                </button>
              ))}
            </div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>Or choose another shelf</summary>
            <div style={{ marginTop: 10 }}>
              <SpotPicker locationId={locationId} value={spot?.id} onChange={(s) => setSpot(s)} />
            </div>
          </details>

          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-card)', paddingTop: 8, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>{spot ? <>Put <strong>{quantity}</strong> on <SpotChip address={spot.address} isShopFloor={spot.isShopFloor} showTag={false} /></> : <span className="sh-muted">Choose or scan a shelf</span>}</span>
            <button type="button" className="btn-primary" disabled={!spot || put.isPending} onClick={() => confirm()} style={{ minWidth: 160, minHeight: 44, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              {put.isPending ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={18} />} Put away
            </button>
          </div>
        </>
      )}
    </div>
  );
}
