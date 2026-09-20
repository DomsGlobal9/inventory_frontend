import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, Check, ChevronRight, Loader2, SkipForward, Trash2, TriangleAlert, PartyPopper, RotateCcw, Flag
} from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import {
  useFillStatus, useOpenShelfForFill, useSaveShelfFill, useSkipShelf, useFinishFirstFill, useReopenFirstFill,
  useShelfFind, isLabelScan, looksLikeAddress
} from '../../hooks/useShelves';
import { ShelvesLayout, SpotChip, EmptyState, ScanInput, ItemThumb, itemDetail, Stepper, pieces } from '../../components/shelves/ShelfBits';
import ConfirmModal from '../../components/ConfirmModal';

/**
 * Fill your shelves: the first walk round the shop, one shelf at a time.
 *
 * It never creates stock. Each line says "this many of this item are on this shelf", and ScaleEzy
 * moves those pieces from Not shelved onto the shelf. A line asking for more than the shop has is
 * marked where it stands -- the whole shelf waits, nothing is half-saved, and nothing the person
 * typed is thrown away.
 */
export default function FillShelves() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const status = useFillStatus(locationId);
  const open = useOpenShelfForFill();
  const save = useSaveShelfFill();
  const skip = useSkipShelf();
  const finish = useFinishFirstFill();
  const reopen = useReopenFirstFill();

  const [shelf, setShelf] = useState(null);   // the open shelf, from the server
  const [lines, setLines] = useState([]);     // [{ variantId, title, detail, quantity, problem }]
  const [query, setQuery] = useState('');
  const [confirmFinish, setConfirmFinish] = useState(null);
  const saveKey = useRef(null);
  const search = useShelfFind(query.trim().length >= 2 && !isLabelScan(query) ? query.trim() : '', locationId);

  const data = status.data;
  const done = data ? data.shelves.completed : 0;
  const total = data ? data.shelves.total : 0;

  // A fresh key each time a shelf is opened: a retry after the network drops is not a second save.
  const openShelf = (spotId) => open.mutate({ spotId }, {
    onSuccess: (s) => { setShelf(s); setLines([]); setQuery(''); saveKey.current = `${spotId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  });

  useEffect(() => { setShelf(null); setLines([]); }, [locationId]);

  if (!can('shelf:putaway')) {
    return (
      <ShelvesLayout title="Fill your shelves" icon={Boxes}>
        <div className="sh-card">
          <EmptyState icon={Boxes} title="You cannot put stock away"
            text="Ask whoever manages your team for the permission to put stock away and move it." />
        </div>
      </ShelvesLayout>
    );
  }

  const addItem = (item) => {
    const variantId = item.variantId ?? item.id;
    if (!variantId) return;
    setLines(old => {
      const at = old.findIndex(l => l.variantId === variantId);
      if (at >= 0) return old.map((l, i) => (i === at ? { ...l, quantity: Number(l.quantity || 0) + 1, problem: null } : l));
      return [...old, { variantId, title: item.title, detail: itemDetail(item), imageUrl: item.imageUrl, quantity: 1, problem: null }];
    });
    setQuery('');
  };

  // A quantity box in the middle of being typed (empty, or 0) must not reach the server: the person
  // would get a refusal for something they are still doing. The button waits instead.
  const halfTyped = lines.some(l => !Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1);

  const saveShelf = () => {
    if (lines.length === 0 || halfTyped) return;
    save.mutate(
      { spotId: shelf.spot.id, saveKey: saveKey.current, lines: lines.map(l => ({ variantId: l.variantId, quantity: Number(l.quantity) })) },
      {
        onSuccess: (r) => {
          if (r.saved === false) {
            // Mark the lines that need a change; everything else stays exactly where it was.
            setLines(old => old.map(l => {
              const bad = r.problems.find(p => p.variantId === l.variantId);
              return bad ? { ...l, problem: bad.message, free: bad.free } : { ...l, problem: null };
            }));
            return;
          }
          setShelf(null);
          setLines([]);
          status.refetch();
        }
      }
    );
  };

  const nextShelf = data?.next;
  const filling = data?.firstFill?.state === 'FILLING';
  const finished = data?.firstFill?.state === 'FINISHED';

  return (
    <ShelvesLayout
      title="Fill your shelves"
      icon={Boxes}
      subtitle="Stand at a shelf, add what is on it, and move to the next one. This never changes how much stock you have."
      actions={can('shelf:manage') && filling && (
        <button type="button" className="btn-secondary" style={{ display: 'flex', gap: 6, alignItems: 'center' }}
          onClick={() => finish.mutate({ locationId }, { onSuccess: (r) => { if (r.needsConfirming) setConfirmFinish(r.message); else status.refetch(); } })}>
          <Flag size={15} /> Finished
        </button>
      )}
    >
      {status.isLoading ? (
        <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : !data ? (
        <div className="sh-card">
          <EmptyState icon={Boxes} title="Could not load this" text={status.error?.message || 'Check your connection and try again.'}
            action={<button type="button" className="btn-secondary" onClick={() => status.refetch()}>Try again</button>} />
        </div>
      ) : total === 0 ? (
        <div className="sh-card">
          <EmptyState icon={Boxes} title={`No shelves at ${currentLocation?.name} yet`}
            text="Describe this place first, so there are shelves to fill."
            action={<Link className="btn-primary" to="/shelves/setup" style={{ textDecoration: 'none' }}>Go to Racks &amp; shelves</Link>} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Where the walk has got to. Two numbers, because they answer different questions. */}
          <div className="sh-card" style={{ display: 'grid', gap: 10 }}>
            <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{done} of {total} {total === 1 ? 'shelf' : 'shelves'} done</strong>
              <span className="sh-muted">{pieces(data.piecesWaiting)} still on no shelf</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-input)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${total ? Math.round((done / total) * 100) : 0}%`, background: 'var(--accent-success, #16a34a)' }} />
            </div>
            {data.needStockCheck > 0 && (
              <Link to="/inventory" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--accent-warning)', textDecoration: 'none' }}>
                <TriangleAlert size={15} />
                {data.needStockCheck} {data.needStockCheck === 1 ? 'item needs' : 'items need'} a stock check: their numbers do not add up.
              </Link>
            )}
            {filling && (
              <span className="sh-muted" style={{ fontSize: 13 }}>
                While you are filling, a till sale takes a piece that is on no shelf first, so a shelf you have just
                counted stays right.
              </span>
            )}
            {finished && (
              <div className="sh-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><PartyPopper size={16} /> The first fill is finished.</span>
                {can('shelf:manage') && (
                  <button type="button" className="btn-secondary" style={{ padding: '4px 10px', display: 'flex', gap: 6, alignItems: 'center' }}
                    onClick={() => reopen.mutate({ locationId }, { onSuccess: () => status.refetch() })}>
                    <RotateCcw size={14} /> Fill again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* The shelf in hand. */}
          {shelf ? (
            <div className="sh-card" style={{ display: 'grid', gap: 12 }}>
              <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <SpotChip address={shelf.spot.address} name={shelf.spot.name} isShopFloor={shelf.spot.isShopFloor} size="lg" />
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => { setShelf(null); setLines([]); }}>
                  Leave this shelf
                </button>
              </div>

              {shelf.heldBySomeoneElse && (
                <p style={{ margin: 0, color: 'var(--accent-warning)' }}>
                  {shelf.heldBySomeoneElse.who} was at this shelf {shelf.heldBySomeoneElse.minutesAgo} {shelf.heldBySomeoneElse.minutesAgo === 1 ? 'minute' : 'minutes'} ago.
                  You can carry on: what you add is added to theirs.
                </p>
              )}

              {shelf.alreadyOnIt.length > 0 && (
                <div style={{ display: 'grid', gap: 4 }}>
                  <span className="sh-muted">Already recorded on this shelf</span>
                  {shelf.alreadyOnIt.map(it => (
                    <span key={it.variantId} className="sh-muted" style={{ fontSize: 13 }}>{it.quantity} × {it.title}{it.size && it.size !== 'Free' ? ` · ${it.size}` : ''}</span>
                  ))}
                  <span className="sh-muted" style={{ fontSize: 12 }}>Add only what is not in this list yet.</span>
                </div>
              )}

              {/* A scan (or Enter) with exactly one match adds it; several matches must be chosen from,
                  because a size guessed wrong puts the wrong pieces on the shelf. */}
              <ScanInput value={query} onChange={setQuery} placeholder="Scan the price tag, or type a name or SKU"
                label="Scan or search for what is on this shelf" busy={search.isFetching}
                onSubmit={() => {
                  const found = search.data?.items ?? [];
                  if (found.length === 1) addItem(found[0]);
                }} />

              {/* One match is chosen for you. Several: the person picks, because a size must not be guessed. */}
              {query.trim().length >= 2 && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {search.isFetching && <span className="sh-muted"><Loader2 size={14} className="animate-spin" /> Looking…</span>}
                  {!search.isFetching && (search.data?.items?.length ?? 0) === 0 && <span className="sh-muted">Nothing matches that. Try the name, or the number under the barcode.</span>}
                  {(search.data?.items ?? []).length > 1 && <span className="sh-muted">This matches {search.data.items.length} items. Choose the right size or colour.</span>}
                  {(search.data?.items ?? []).map(item => (
                    <button key={item.variantId} type="button" className="sh-list-btn" onClick={() => addItem(item)}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left' }}>
                      <ItemThumb url={item.imageUrl} size={36} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block' }}>{item.title}</strong>
                        <span className="sh-muted" style={{ fontSize: 12 }}>{itemDetail(item)}</span>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              )}

              {lines.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {lines.map((l, i) => (
                    <div key={l.variantId} style={{
                      display: 'grid', gap: 6, padding: 10, borderRadius: 10,
                      border: `1px solid ${l.problem ? 'var(--accent-warning)' : 'var(--border-light)'}`
                    }}>
                      <div className="sh-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 140 }}>
                          <strong style={{ display: 'block' }}>{l.title}</strong>
                          <span className="sh-muted" style={{ fontSize: 12 }}>{l.detail}</span>
                        </span>
                        <Stepper value={Number(l.quantity)} min={1}
                          onChange={(v) => setLines(old => old.map((x, j) => (j === i ? { ...x, quantity: v, problem: null } : x)))} />
                        <button type="button" className="sh-iconbtn" aria-label={`Remove ${l.title}`}
                          onClick={() => setLines(old => old.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                      </div>
                      {l.problem && (
                        <div className="sh-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: 'var(--accent-warning)', fontSize: 13, flex: 1, minWidth: 180 }}>{l.problem}</span>
                          {l.free > 0 && (
                            <button type="button" className="btn-secondary" style={{ padding: '4px 10px', whiteSpace: 'nowrap' }}
                              onClick={() => setLines(old => old.map((x, j) => (j === i ? { ...x, quantity: l.free, problem: null } : x)))}>
                              Use {l.free}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <button type="button" className="btn-secondary" style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  onClick={() => skip.mutate({ spotId: shelf.spot.id }, { onSuccess: () => { setShelf(null); setLines([]); status.refetch(); } })}>
                  <SkipForward size={15} /> Skip this shelf
                </button>
                <button type="button" className="btn-primary" disabled={lines.length === 0 || halfTyped || save.isPending}
                  title={halfTyped ? 'Type how many of each item are on this shelf.' : undefined}
                  style={{ minWidth: 190, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}
                  onClick={saveShelf}>
                  {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Done with this shelf
                </button>
              </div>
              {lines.length === 0 && (
                <span className="sh-muted" style={{ fontSize: 13 }}>
                  Nothing on this shelf? Use <strong>Skip this shelf</strong>, so ScaleEzy knows you have been here.
                </span>
              )}
              {halfTyped && (
                <span className="sh-muted" style={{ fontSize: 13 }}>
                  Type how many of each item are on this shelf, at least 1. Or take the line off with the bin.
                </span>
              )}
            </div>
          ) : (
            <div className="sh-card" style={{ display: 'grid', gap: 12 }}>
              {nextShelf ? (
                <>
                  <span className="sh-muted">Next shelf, in walking order</span>
                  <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <SpotChip address={nextShelf.address} name={nextShelf.name} size="lg" />
                    <button type="button" className="btn-primary" disabled={open.isPending}
                      style={{ minWidth: 170, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => openShelf(nextShelf.spotId)}>
                      {open.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                      I'm at this shelf
                    </button>
                  </div>
                  <span className="sh-muted" style={{ fontSize: 13 }}>Shelf {nextShelf.position} of {total}. Scan its label instead, if you have one printed.</span>
                </>
              ) : (
                <EmptyState icon={PartyPopper} title="Every shelf has been looked at"
                  text={data.piecesWaiting > 0
                    ? `${pieces(data.piecesWaiting)} are still on no shelf. They may be in a pile, at the tailor, or waiting to be put away.`
                    : 'Everything is on a shelf.'} />
              )}
              {data.skippedShelves.length > 0 && (
                <div style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                  <span className="sh-muted">Skipped, to come back to</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {data.skippedShelves.map(s => (
                      <button key={s.spotId} type="button" className="sh-chip sh-addr" onClick={() => openShelf(s.spotId)}>{s.address}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmFinish}
        onClose={() => setConfirmFinish(null)}
        onConfirm={() => finish.mutate({ locationId, force: true }, { onSuccess: () => { setConfirmFinish(null); status.refetch(); } })}
        title="Finish the first fill?"
        message={`${confirmFinish ?? ''} You can still put stock away as usual afterwards, and till sales go back to taking from shop-floor shelves first.`}
        confirmText="Finish"
      />
    </ShelvesLayout>
  );
}
