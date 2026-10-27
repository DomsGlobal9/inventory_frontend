import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Printer, Check, ArrowRight, Loader2, PartyPopper, Settings2 } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useRefillList, useMoveStock } from '../../hooks/useShelves';
import { ShelvesLayout, SpotChip, ItemThumb, EmptyState, Stepper, itemDetail, pieces } from '../../components/shelves/ShelfBits';
import SpotPicker from '../../components/shelves/SpotPicker';

const MIN_KEY = 'scaleezy_refill_min';
const onFloor = (s) => s.isShopFloor;
const savedMin = () => { try { const n = Number(localStorage.getItem(MIN_KEY)); return Number.isInteger(n) && n >= 1 ? n : 2; } catch { return 2; } };

/**
 * Refill the shop floor: carry from the back room before the floor runs out, so a till sale never has
 * to come off a back-room shelf. One walk through the back room, grouped by the shelf you stand at.
 * "Moved" is the ordinary shelf move; the line leaves the list when the floor has enough.
 */
export default function RefillFloor() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const [min, setMin] = useState(savedMin);
  const list = useRefillList(locationId, min);
  const changeMin = (n) => { setMin(n); try { localStorage.setItem(MIN_KEY, String(n)); } catch { /* not kept */ } };

  // Lines grouped by the back-room shelf they are picked up from, in walking order (the server's order).
  const groups = useMemo(() => {
    const out = [];
    for (const line of list.data?.lines ?? []) {
      const last = out[out.length - 1];
      if (last && last.from.spotId === line.from.spotId) last.lines.push(line);
      else out.push({ from: line.from, lines: [line] });
    }
    return out;
  }, [list.data]);
  const total = (list.data?.lines ?? []).reduce((t, l) => t + l.quantity, 0);

  if (!can('shelf:putaway')) {
    return <ShelvesLayout title="Refill the shop floor" icon={Store}><div className="sh-card"><EmptyState icon={Store} title="You cannot move stock between shelves" text="Ask whoever manages your team for the shelf work permission (put away, pick, move and count)." /></div></ShelvesLayout>;
  }

  return (
    <ShelvesLayout
      title="Refill the shop floor"
      icon={Store}
      subtitle="What to bring out from the back room before the floor runs out. Walk the list top to bottom, then press Moved on each line."
      actions={list.data?.lines?.length > 0 && (
        <button type="button" className="btn-secondary sh-noprint" onClick={() => window.print()} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Printer size={15} /> Print list</button>
      )}
    >
      <div className="sh-card sh-row sh-noprint" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="sh-row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Keep at least</span>
          <Stepper value={min} onChange={changeMin} min={1} max={50} label="Pieces to keep on the floor" />
          <span style={{ fontWeight: 600 }}>of each item on the floor</span>
        </div>
        {list.data?.lines?.length > 0 && <span className="sh-muted">{pieces(total)} to carry, {list.data.lines.length} {list.data.lines.length === 1 ? 'line' : 'lines'}</span>}
      </div>

      {list.isLoading ? (
        <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Working out what the floor needs…</div>
      ) : list.isError ? (
        <div className="sh-card"><EmptyState icon={Store} title="Could not make the list" text={list.error?.message || 'Try again in a moment.'} /></div>
      ) : list.data && !list.data.usesFloorShelves ? (
        <div className="sh-card">
          <EmptyState icon={Settings2} title="No shop-floor shelves yet"
            text="This list compares the shop floor with the back room. Mark the racks customers can see as Shop floor in Set up racks, and it fills in."
            action={can('shelf:manage') && <Link to="/shelves/setup" className="btn-primary">Set up racks</Link>} />
        </div>
      ) : groups.length === 0 ? (
        <div className="sh-card"><EmptyState icon={PartyPopper} title="The floor is stocked" text={`Every item that has pieces in the back room has at least ${pieces(min)} on the floor.`} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {groups.map(g => (
            <section key={g.from.spotId} className="sh-card" style={{ display: 'grid', gap: 10 }} aria-label={`From ${g.from.address}`}>
              <div className="sh-row" style={{ flexWrap: 'wrap' }}>
                <span className="sh-section-title" style={{ margin: 0 }}>Pick up at</span>
                <SpotChip address={g.from.address} name={g.from.name} isShopFloor={false} size="lg" />
              </div>
              {g.lines.map(line => <RefillLine key={`${line.variantId}:${line.from.spotId}`} line={line} locationId={locationId} />)}
            </section>
          ))}
          {list.data?.more > 0 && <p className="sh-muted" style={{ margin: 0 }}>{list.data.more} more lines after these. Carry these first, the list moves up.</p>}
        </div>
      )}
    </ShelvesLayout>
  );
}

function RefillLine({ line, locationId }) {
  const move = useMoveStock();
  const [quantity, setQuantity] = useState(line.quantity);
  const [to, setTo] = useState(line.to);
  const [choosing, setChoosing] = useState(false);

  const moved = () => {
    if (!to || move.isPending) return;
    move.mutate({ locationId, variantId: line.variantId, fromSpotId: line.from.spotId, toSpotId: to.spotId, quantity });
  };

  return (
    <div style={{ display: 'grid', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-light)' }}>
      <div className="sh-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ItemThumb url={line.imageUrl} size={48} />
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{line.title}</div>
          <div className="sh-muted">{itemDetail(line)}</div>
          <div className="sh-muted" style={{ marginTop: 2 }}>
            {line.onFloor === 0 ? 'None on the floor' : `${line.onFloor} on the floor`} · {line.inBackRoom} in the back room
            {line.soldLast7Days > 0 && ` · ${line.soldLast7Days} sold this week`}
          </div>
        </div>
        <div className="sh-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="sh-big-qty" aria-label={`Carry ${line.quantity}`}>{line.quantity}</span>
          <ArrowRight size={18} className="sh-muted" />
          {to ? (
            <button type="button" onClick={() => setChoosing(c => !c)} title="Put it on another floor shelf" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <SpotChip address={to.address} name={to.name} isShopFloor />
            </button>
          ) : (
            <button type="button" className="btn-secondary sh-noprint" onClick={() => setChoosing(true)}>Choose a floor shelf</button>
          )}
        </div>
      </div>
      {choosing && (
        <div className="sh-noprint">
          <SpotPicker locationId={locationId} value={to?.spotId} exclude={[line.from.spotId]} only={onFloor} emptyText="No shop-floor shelves yet. Mark some as Shop floor in Set up racks."
            onChange={(s) => { setTo({ spotId: s.id, address: s.address, name: s.name }); setChoosing(false); }} />
        </div>
      )}
      <div className="sh-row sh-noprint" style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        {line.quantity > 1 && <Stepper value={quantity} onChange={setQuantity} min={1} max={line.quantity} label="Pieces carried" />}
        <button type="button" className="btn-primary" disabled={!to || move.isPending} onClick={moved}
          title={to ? `Records ${pieces(quantity)} moved from ${line.from.address} to ${to.address}` : 'Choose the floor shelf first'}
          style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {move.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Moved
        </button>
      </div>
    </div>
  );
}
