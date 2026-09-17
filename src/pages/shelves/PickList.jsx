import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, CheckCircle2, Circle, Loader2, PackageX, Truck, RotateCcw, SearchX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { usePickOrders, usePickList, useReportNotFound, isLabelScan } from '../../hooks/useShelves';
import { api } from '../../lib/api';
import { invalidateDerivedViews } from '../../lib/invalidate';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, itemDetail, pieces } from '../../components/shelves/ShelfBits';

const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const channelName = (o) => o.source === 'SHOPIFY' ? 'Shopify' : o.channel === 'ONLINE' ? 'Online' : o.handover === 'KEEP_FOR_CUSTOMER' ? 'Kept for customer' : o.channel === 'POS' ? 'Counter' : o.channel.toLowerCase();

/**
 * Pick lists: choose the orders waiting to go out, walk the shelves once in order, scan each shelf and
 * each item, then send the orders out. The dispatch names the shelves actually picked from, so the
 * ledger and "Where is it?" stay exact -- a piece taken from the back room on a pick list is not an issue.
 */
export default function PickList() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const orders = usePickOrders(locationId);
  const [selected, setSelected] = useState([]);
  const [started, setStarted] = useState(null);

  if (!can('shelf:putaway')) {
    return <ShelvesLayout title="Pick" icon={ClipboardList}><div className="sh-card"><EmptyState icon={ClipboardList} title="You cannot pick orders" text="Ask whoever manages your team for the permission to put stock away and move it." /></div></ShelvesLayout>;
  }

  const list = orders.data?.orders ?? [];
  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length >= 30 ? s : [...s, id]);

  return (
    <ShelvesLayout title="Pick" icon={ClipboardList} subtitle="Choose the orders to send out and walk the shelves once to collect them.">
      {started ? (
        <PickWalk key={started.join(',')} locationId={locationId} orderIds={started} onBack={() => setStarted(null)}
          onDone={() => { setStarted(null); setSelected([]); orders.refetch(); }} canDispatch={can('dispatch:create')} />
      ) : (
        <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
          <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h2 className="sh-section-title" style={{ margin: 0 }}>Waiting to go out from {currentLocation?.name}</h2>
            <div className="sh-row" style={{ gap: 8 }}>
              {list.length > 0 && <button type="button" className="btn-secondary" onClick={() => setSelected(selected.length ? [] : list.slice(0, 30).map(o => o.id))}>{selected.length ? 'Clear' : `Select ${Math.min(30, list.length)}`}</button>}
              <button type="button" className="btn-primary" disabled={selected.length === 0} onClick={() => setStarted(selected)}>
                Pick {selected.length || ''} {selected.length === 1 ? 'order' : 'orders'}
              </button>
            </div>
          </div>
          {orders.isLoading ? <div className="sh-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
            : list.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing waiting to go out" text="Confirmed orders with pieces still to send appear here." />
            : (
              <div style={{ display: 'grid', gap: 4 }}>
                {list.map(o => (
                  <button key={o.id} type="button" className={`sh-list-btn${selected.includes(o.id) ? ' selected' : ''}`} onClick={() => toggle(o.id)} aria-pressed={selected.includes(o.id)}>
                    {selected.includes(o.id) ? <CheckCircle2 size={20} color="var(--accent-success)" /> : <Circle size={20} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{o.orderNumber}</strong> <span className="sh-muted">· {o.customer ?? 'Customer'} · {channelName(o)}</span>
                      <span className="sh-muted" style={{ display: 'block' }}>{when(o.createdAt)} · {o.lines} {o.lines === 1 ? 'line' : 'lines'}{o.status === 'PARTIALLY_DISPATCHED' ? ' · partly sent' : ''}</span>
                    </span>
                    <span className="sh-big-qty" style={{ fontSize: 18 }}>{o.pieces}</span>
                  </button>
                ))}
              </div>
            )}
        </section>
      )}
    </ShelvesLayout>
  );
}

function PickWalk({ locationId, orderIds, onBack, onDone, canDispatch }) {
  const pick = usePickList(locationId, orderIds);
  const report = useReportNotFound();
  const queryClient = useQueryClient();
  // picked[key] = pieces confirmed at that stop for that line; key = spotId|salesOrderItemId, or loose|id
  const [picked, setPicked] = useState({});
  const [scan, setScan] = useState('');
  const [sending, setSending] = useState(false);
  const data = pick.data;

  const tasks = useMemo(() => {
    if (!data) return [];
    const fromStops = data.stops.flatMap(stop => stop.picks.map(p => ({ key: `${stop.spotId}|${p.salesOrderItemId}`, stop, ...p })));
    const loose = data.notShelved.map(p => ({ key: `loose|${p.salesOrderItemId}`, stop: null, ...p }));
    return [...fromStops, ...loose];
  }, [data]);
  const done = tasks.filter(t => (picked[t.key] ?? 0) >= t.quantity).length;
  // Pieces in hand: what was picked, less anything reported as not on the shelf. A line marked
  // "Not here" counts as dealt with for the walk, but there is nothing of it to send.
  const readyPieces = tasks.reduce((n, t) => n + Math.max(0, (picked[t.key] ?? 0) - (picked[`${t.key}|missing`] ?? 0)), 0);
  const current = tasks.find(t => (picked[t.key] ?? 0) < t.quantity);

  const confirm = (task, n = task.quantity) => setPicked(p => ({ ...p, [task.key]: Math.min(task.quantity, n) }));

  const onScan = (typed) => {
    if (!current) return;
    if (isLabelScan(typed)) {
      const code = typed.trim().toUpperCase().replace(/^SEZ:\s*/, '');
      if (current.stop && current.stop.labelCode === code) toast.success(`At ${current.stop.address}. Now scan the item.`);
      else toast.error(current.stop ? `That is not ${current.stop.address}.` : 'This piece is not on a shelf; scan the item.');
      return;
    }
    const matches = tasks.filter(t => (picked[t.key] ?? 0) < t.quantity && [t.item.barcode, t.item.sku, t.item.code].some(v => v && v.toLowerCase() === typed.toLowerCase()));
    const task = matches.find(t => t.key === current.key) ?? matches[0];
    if (!task) { toast.error(`"${typed}" is not on this pick list, or all of it is picked.`); return; }
    confirm(task, (picked[task.key] ?? 0) + 1);
  };

  const notHere = (task) => {
    const missing = task.quantity - (picked[task.key] ?? 0);
    if (!task.stop || missing <= 0) return;
    report.mutate({ spotId: task.stop.spotId, variantId: task.item.variantId, missing }, {
      // What was found is kept; the rest of this line is left to another shelf or another day.
      onSuccess: () => setPicked(p => ({ ...p, [task.key]: task.quantity, [`${task.key}|missing`]: missing }))
    });
  };

  const inFlight = useRef(false);
  const sendOut = async () => {
    // Two presses before the button disables would send the orders twice.
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    let sent = 0;
    const problems = [];
    for (const order of data.orders) {
      const lines = new Map();
      for (const t of tasks.filter(t => t.orderId === order.id)) {
        const got = Math.max(0, (picked[t.key] ?? 0) - (picked[`${t.key}|missing`] ?? 0));
        if (got === 0) continue;
        const line = lines.get(t.salesOrderItemId) ?? { salesOrderItemId: t.salesOrderItemId, quantity: 0, fromSpots: [] };
        line.quantity += got;
        if (t.stop) line.fromSpots.push({ spotId: t.stop.spotId, quantity: got });
        lines.set(t.salesOrderItemId, line);
      }
      if (lines.size === 0) continue;
      try {
        await api.post('/dispatches', { salesOrderId: order.id, items: [...lines.values()].map(l => ({ ...l, fromSpots: l.fromSpots.length ? l.fromSpots : undefined })) });
        sent++;
      } catch (err) {
        problems.push(`${order.orderNumber}: ${err?.message || 'could not be sent'}`);
      }
    }
    setSending(false);
    inFlight.current = false;
    if (sent) toast.success(`${sent} ${sent === 1 ? 'order' : 'orders'} sent out.`);
    problems.forEach(p => toast.error(p));
    if (!sent && !problems.length) toast('Nothing to send out: none of these pieces were found.', { icon: 'ℹ️' });
    // Leave the walk BEFORE asking the lists to refresh. The other way round, the pick list for
    // orders that have just gone out asks for them again, is told "SO-… is dispatched, so there is
    // nothing to pick for it", and that refusal was shown in red beside "1 order sent out."
    if (sent) onDone();
    invalidateDerivedViews(queryClient);
    queryClient.invalidateQueries({ queryKey: ['shelves'] });
    queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
  };

  if (pick.isLoading) return <div className="sh-card sh-muted"><Loader2 size={16} className="animate-spin" /> Working out the walk…</div>;
  if (pick.isError) return <div className="sh-card"><EmptyState icon={SearchX} title="Could not make the pick list" text={pick.error?.message} action={<button className="btn-secondary" onClick={onBack}>Back</button>} /></div>;

  const allDone = tasks.length > 0 && done === tasks.length;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="sh-card" style={{ display: 'grid', gap: 10, position: 'sticky', top: 0, zIndex: 3 }}>
        <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span><strong>{done} of {tasks.length}</strong> <span className="sh-muted">picks · {pieces(data.pieces)} for {data.orders.length} {data.orders.length === 1 ? 'order' : 'orders'}</span></span>
          <button type="button" className="btn-secondary" onClick={onBack} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><RotateCcw size={14} /> Choose orders</button>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-input)', overflow: 'hidden' }}>
          <div style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`, height: '100%', background: 'var(--accent-success)', transition: 'width .2s' }} />
        </div>
        <ScanInput value={scan} onChange={setScan} onSubmit={onScan} clearOnSubmit placeholder={current ? (current.stop ? `Go to ${current.stop.address}, scan the item` : 'Scan the item') : 'All picked'} />
      </div>

      {data.short.length > 0 && (
        <div className="sh-card" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
          <strong>Not enough here</strong>
          {data.short.map(s => <div key={s.salesOrderItemId} className="sh-muted">{s.orderNumber}: {s.quantity} × {s.item.title} ({s.item.sku})</div>)}
        </div>
      )}

      {data.stops.map((stop, i) => (
        <section key={stop.spotId} className="sh-card" style={{ display: 'grid', gap: 10, opacity: stop.picks.every(p => (picked[`${stop.spotId}|${p.salesOrderItemId}`] ?? 0) >= p.quantity) ? 0.55 : 1 }}>
          <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span className="sh-row" style={{ gap: 10 }}>
              <span className="sh-count" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>{i + 1}</span>
              <SpotChip address={stop.address} name={stop.name} colour={stop.colour} isShopFloor={stop.isShopFloor} size="lg" />
            </span>
          </div>
          {stop.picks.map(p => <PickRow key={p.salesOrderItemId} task={tasks.find(t => t.key === `${stop.spotId}|${p.salesOrderItemId}`)} picked={picked} confirm={confirm} notHere={notHere} busy={report.isPending} />)}
        </section>
      ))}

      {data.notShelved.length > 0 && (
        <section className="sh-card" style={{ display: 'grid', gap: 10 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>Not on a shelf — find these in the location</h3>
          {data.notShelved.map(p => <PickRow key={p.salesOrderItemId} task={tasks.find(t => t.key === `loose|${p.salesOrderItemId}`)} picked={picked} confirm={confirm} />)}
        </section>
      )}

      <div className="sh-card sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', position: 'sticky', bottom: 0 }}>
        <span className="sh-muted">{allDone ? (readyPieces ? 'Everything is picked.' : 'Nothing was found to send out.') : `${tasks.length - done} still to pick. You can send out what is picked.`}</span>
        {canDispatch ? (
          <button type="button" className="btn-primary" disabled={readyPieces === 0 || sending} onClick={sendOut} style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Truck size={18} />} Send out picked
          </button>
        ) : <span className="sh-muted">Someone who can send orders out finishes this.</span>}
      </div>
    </div>
  );
}

function PickRow({ task, picked, confirm, notHere, busy }) {
  if (!task) return null;
  const got = picked[task.key] ?? 0;
  const missing = picked[`${task.key}|missing`] ?? 0;
  const complete = got >= task.quantity;
  return (
    <div className="sh-row" style={{ flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, background: complete ? 'rgba(16,185,129,.08)' : 'var(--bg-input)' }}>
      <ItemThumb url={task.item.imageUrl} size={48} />
      <span style={{ flex: 1, minWidth: 160 }}>
        <strong style={{ display: 'block' }}>{task.item.title}</strong>
        <span className="sh-muted">{itemDetail(task.item)} · {task.orderNumber}</span>
        {missing > 0 && <span style={{ display: 'block', color: 'var(--accent-danger)', fontSize: 13 }}>{missing} not found — reported</span>}
      </span>
      <span className="sh-big-qty" style={{ fontSize: 20 }}>{Math.max(0, got - missing)}/{task.quantity}</span>
      {!complete && (
        <span className="sh-row" style={{ gap: 6 }}>
          <button type="button" className="btn-primary" onClick={() => confirm(task)} style={{ minHeight: 40 }}>Picked</button>
          {notHere && task.stop && <button type="button" className="btn-secondary" disabled={busy} onClick={() => notHere(task)} style={{ minHeight: 40, display: 'flex', gap: 6, alignItems: 'center' }}><PackageX size={15} /> Not here</button>}
        </span>
      )}
      {complete && <CheckCircle2 size={22} color="var(--accent-success)" />}
    </div>
  );
}
