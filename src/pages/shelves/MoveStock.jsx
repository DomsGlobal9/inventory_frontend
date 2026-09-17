import React, { useEffect, useRef, useState } from 'react';
import { useUnsavedWork } from '../../contexts/UnsavedWorkContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRightLeft, ArrowDown, PackageOpen, Loader2, RotateCcw, Layers } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useSpot, useMoveStock, useMoveAll, isLabelScan, looksLikeAddress, resolveSpot } from '../../hooks/useShelves';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, Stepper, itemDetail, pieces } from '../../components/shelves/ShelfBits';
import SpotPicker from '../../components/shelves/SpotPicker';
import ConfirmModal from '../../components/ConfirmModal';

/**
 * Move stock: from one shelf to another, everything off a shelf at once, or back to Not shelved.
 * Three steps, each answerable with one scan: the shelf it's leaving, the item, the shelf it's going to.
 */
export default function MoveStock() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const [params, setParams] = useSearchParams();
  const fromId = params.get('spot');
  const from = useSpot(fromId);
  const [variantId, setVariantId] = useState(params.get('variant'));
  const [quantity, setQuantity] = useState(1);
  useUnsavedWork(!!variantId, 'a move waiting for the shelf it goes to');
  const [fromScan, setFromScan] = useState('');
  const [toScan, setToScan] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(null);
  const move = useMoveStock();
  const moveAll = useMoveAll();
  const toRef = useRef(null);

  const items = from.data?.items ?? [];
  const item = items.find(i => i.variantId === variantId) ?? null;

  useEffect(() => {
    // One item on the shelf: nothing to choose.
    if (from.data && !item && items.length === 1) setVariantId(items[0].variantId);
  }, [from.data, item, items]);
  useEffect(() => { if (item) { setQuantity(q => Math.min(Math.max(1, q), item.quantity)); setTimeout(() => toRef.current?.focus(), 60); } }, [item?.variantId, item?.quantity]);
  useEffect(() => { if (from.data && from.data.spot.location?.id !== locationId) toast.error(`${from.data.spot.address} is in ${from.data.spot.location?.name}. Switch location in the top bar to move stock there.`); }, [from.data, locationId]);

  const setFrom = (spotId) => {
    setVariantId(null);
    setParams(spotId ? { spot: spotId } : {}, { replace: true });
  };

  const scanFrom = async (typed) => {
    if (!isLabelScan(typed) && !looksLikeAddress(typed)) { toast.error('Scan the label on the shelf the pieces are on.'); return; }
    setBusy(true);
    try {
      const found = await resolveSpot(typed, locationId);
      setFrom(found.spot.id);
      setFromScan('');
    } catch (err) { toast.error(err?.message || 'No shelf matches that label.'); }
    finally { setBusy(false); }
  };

  // A scanner can send Enter twice in the same moment; state would not have updated between them.
  const sending = useRef(false);
  const go = (toSpot) => {
    if (!item || sending.current || move.isPending) return;
    if (quantity < 1) { toast.error('Type how many to move, at least 1.'); return; }
    if (toSpot && toSpot.id === fromId) { toast.error('The pieces are already on that shelf.'); return; }
    sending.current = true;
    move.mutate({ locationId, variantId: item.variantId, fromSpotId: fromId, toSpotId: toSpot?.id, quantity }, {
      onSuccess: () => { setToScan(''); setVariantId(null); },
      onSettled: () => { sending.current = false; }
    });
  };

  const scanTo = async (typed) => {
    if (busy || sending.current) return;
    if (!isLabelScan(typed) && !looksLikeAddress(typed)) { toast.error('Scan the label on the shelf they are going to.'); return; }
    setBusy(true);
    try {
      const found = await resolveSpot(typed, locationId);
      if (found.spot.location?.id !== locationId) toast.error(`${found.spot.address} is in another location. Use a transfer for that.`);
      else if (!found.spot.holdsStock) toast.error(`${found.spot.address} has shelves inside it. Scan one of those.`);
      else if (confirmAll) setConfirmAll({ ...confirmAll, to: found.spot });
      else go(found.spot);
    } catch (err) { toast.error(err?.message || 'No shelf matches that label.'); }
    finally { setBusy(false); }
  };

  if (!can('shelf:putaway')) {
    return <ShelvesLayout title="Move stock" icon={ArrowRightLeft}><div className="sh-card"><EmptyState icon={ArrowRightLeft} title="You cannot move stock between shelves" text="Ask whoever manages your team for the permission to put stock away and move it." /></div></ShelvesLayout>;
  }

  const wrongLocation = from.data && from.data.spot.location?.id !== locationId;

  return (
    <ShelvesLayout title="Move stock" icon={ArrowRightLeft} subtitle="Scan the shelf the pieces are on, choose the item, then scan where they go.">
      <div className="sh-grid-2">
        <section className="sh-card" style={{ display: 'grid', gap: 14 }} aria-label="From">
          <h2 className="sh-section-title" style={{ margin: 0 }}>1 · From</h2>
          {!fromId || from.isError ? (
            <>
              <ScanInput value={fromScan} onChange={setFromScan} onSubmit={scanFrom} busy={busy} placeholder="Scan the shelf label the pieces are on" label="Scan the shelf it comes from" />
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Or choose the shelf</summary>
                <div style={{ marginTop: 10 }}><SpotPicker locationId={locationId} value={fromId} onChange={(s) => setFrom(s.id)} /></div>
              </details>
            </>
          ) : from.isLoading ? (
            <div className="sh-muted"><Loader2 size={16} className="animate-spin" /> Loading shelf…</div>
          ) : (
            <>
              <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <SpotChip address={from.data.spot.address} name={from.data.spot.name} colour={from.data.spot.colour} isShopFloor={from.data.spot.isShopFloor} size="lg" />
                <button type="button" className="btn-secondary" onClick={() => setFrom(null)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><RotateCcw size={14} /> Another shelf</button>
              </div>
              {wrongLocation ? (
                <EmptyState title="Another location" text={`${from.data.spot.address} is in ${from.data.spot.location?.name}.`} />
              ) : items.length === 0 ? (
                <EmptyState icon={PackageOpen} title="Nothing on this shelf" text="There is nothing to move from here." />
              ) : (
                <>
                  <h3 className="sh-section-title" style={{ margin: 0 }}>2 · Which item</h3>
                  <div style={{ display: 'grid', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
                    {items.map(it => (
                      <button key={it.variantId} type="button" className={`sh-list-btn${variantId === it.variantId ? ' selected' : ''}`} onClick={() => setVariantId(it.variantId)}>
                        <ItemThumb url={it.imageUrl} size={44} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                          <span className="sh-muted" style={{ display: 'block' }}>{itemDetail(it)}</span>
                        </span>
                        <span className="sh-big-qty" style={{ fontSize: 18 }}>{it.quantity}</span>
                      </button>
                    ))}
                  </div>
                  {items.length > 1 && (
                    <button type="button" className="btn-secondary" onClick={() => setConfirmAll({ to: null })} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={16} /> Move everything on this shelf ({pieces(from.data.total)})
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>

        <section className="sh-card" style={{ display: 'grid', gap: 14 }} aria-label="To">
          <h2 className="sh-section-title" style={{ margin: 0 }}>3 · To</h2>
          {wrongLocation ? (
            // The store was changed at the top while this was open: every button below would be
            // refused by the server, so none of them is offered.
            <p className="sh-muted" style={{ margin: 0 }}>
              This shelf is in another store. Change the store at the top back, or use a transfer to move stock between stores.
            </p>
          ) : confirmAll ? (
            <>
              <p style={{ margin: 0 }}>Everything on <strong className="sh-addr">{from.data?.spot.address}</strong> goes to:</p>
              <ScanInput ref={toRef} value={toScan} onChange={setToScan} onSubmit={scanTo} busy={busy} placeholder="Scan the shelf label they are going to" label="Scan the shelf it goes to" />
              <SpotPicker locationId={locationId} value={confirmAll.to?.id} exclude={[fromId]} onChange={(s) => setConfirmAll({ to: s })} maxHeight={260} />
              <div className="sh-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setConfirmAll(null)}>Cancel</button>
              </div>
            </>
          ) : !item ? (
            <EmptyState icon={ArrowDown} title="Choose what to move" text="Pick the shelf and the item on the left first." />
          ) : (
            <>
              <div className="sh-row">
                <ItemThumb url={item.imageUrl} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <div className="sh-muted">{itemDetail(item)}</div>
                </div>
              </div>
              <div className="sh-row" style={{ flexWrap: 'wrap' }}>
                <Stepper value={quantity} onChange={setQuantity} min={1} max={item.quantity} />
                {quantity !== item.quantity && <button type="button" className="btn-secondary" onClick={() => setQuantity(item.quantity)}>All {item.quantity}</button>}
              </div>
              <ScanInput ref={toRef} value={toScan} onChange={setToScan} onSubmit={scanTo} busy={busy || move.isPending} autoFocus={false} placeholder="Scan the shelf label — it moves straight away" label="Scan the shelf it goes to" />
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Or choose the shelf</summary>
                <div style={{ marginTop: 10 }}>
                  <SpotPicker locationId={locationId} exclude={[fromId]} onChange={(s) => go(s)} maxHeight={260} />
                </div>
              </details>
              <button type="button" className="btn-secondary" disabled={move.isPending || quantity < 1} onClick={() => go(null)}>
                Take {quantity} off the shelf (back to Not shelved)
              </button>
            </>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={!!confirmAll?.to}
        onClose={() => setConfirmAll(c => (c ? { to: null } : c))}
        onConfirm={async () => {
          await moveAll.mutateAsync({ fromSpotId: fromId, toSpotId: confirmAll.to.id });
          setConfirmAll(null);
          setVariantId(null);
        }}
        title="Move everything?"
        message={`Every item on ${from.data?.spot.address ?? ''} (${pieces(from.data?.total ?? 0)}) moves to ${confirmAll?.to?.address ?? ''}.`}
        confirmText="Move everything"
      />
    </ShelvesLayout>
  );
}
