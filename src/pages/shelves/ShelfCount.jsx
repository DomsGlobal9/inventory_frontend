import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUnsavedWork } from '../../contexts/UnsavedWorkContext';
import toast from 'react-hot-toast';
import { ClipboardCheck, Loader2, RotateCcw, Plus, Minus, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useCountSpot, useSpotTree, isLabelScan, looksLikeAddress, resolveSpot } from '../../hooks/useShelves';
import { api } from '../../lib/api';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, itemDetail } from '../../components/shelves/ShelfBits';
import SpotPicker, { holdingSpots } from '../../components/shelves/SpotPicker';

/**
 * Count one shelf. Scan its label, then scan every piece on it (or type the numbers). What is recorded
 * stays hidden until the count is in, so the count is what is there, not what the screen expected.
 */
export default function ShelfCount() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const [shelf, setShelf] = useState(null); // resolveSpot result
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!can('shelf:putaway')) {
    return <ShelvesLayout title="Count a shelf" icon={ClipboardCheck}><div className="sh-card"><EmptyState icon={ClipboardCheck} title="You cannot count shelves" text="Ask whoever manages your team for the shelf work permission (put away, pick, move and count)." /></div></ShelvesLayout>;
  }

  const openShelf = async (typed) => {
    if (!isLabelScan(typed) && !looksLikeAddress(typed)) { toast.error('Scan the label on the shelf you are counting.'); return; }
    setBusy(true);
    try {
      const found = await resolveSpot(typed, locationId);
      if (!found.spot.holdsStock) toast.error(`${found.spot.address} has shelves inside it. Count one of those.`);
      else if (found.spot.location?.id !== locationId) toast.error(`${found.spot.address} is in ${found.spot.location?.name}.`);
      else { setShelf(found); setText(''); }
    } catch (err) { toast.error(err?.message || 'No shelf matches that label.'); }
    finally { setBusy(false); }
  };

  const openById = async (spotId) => { setBusy(true); try { setShelf((await api.get(`/shelves/spots/${spotId}`)).data); } finally { setBusy(false); } };

  return (
    <ShelvesLayout title="Count a shelf" icon={ClipboardCheck} subtitle="Scan the shelf, then every piece on it. Anything that does not match what was recorded is listed under Problems.">
      {shelf ? (
        <CountSheet key={shelf.spot.id} shelf={shelf} onDone={() => setShelf(null)} />
      ) : (
        <>
        <TodayCounts locationId={locationId} onOpen={openById} />
        <div className="sh-grid-2">
          <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
            <h2 className="sh-section-title" style={{ margin: 0 }}>1 · Which shelf</h2>
            <ScanInput value={text} onChange={setText} onSubmit={openShelf} busy={busy} placeholder="Scan the shelf label" label="Scan the shelf you are counting" />
          </section>
          <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
            <h2 className="sh-section-title" style={{ margin: 0 }}>Or choose it (not counted longest first)</h2>
            <SpotPicker byCount locationId={locationId} onChange={(s) => openById(s.id)} />
          </section>
        </div>
        </>
      )}
    </ShelvesLayout>
  );
}

const CYCLE_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * Today's counts: a few shelves a day, and every shelf gets counted once a month without a stock-take
 * day. Built from each shelf's last-counted time, so it is the same for everyone counting in the store.
 */
function TodayCounts({ locationId, onOpen }) {
  const tree = useSpotTree(locationId);
  const summary = useMemo(() => {
    const spots = holdingSpots(tree.data);
    const today = new Date().toDateString();
    const at = (s) => (s.lastCountedAt ? new Date(s.lastCountedAt) : null);
    const countedToday = spots.filter(s => at(s)?.toDateString() === today);
    const inCycle = spots.filter(s => at(s) && Date.now() - at(s).getTime() <= CYCLE_DAYS * DAY_MS);
    const due = spots.filter(s => !at(s) || Date.now() - at(s).getTime() > CYCLE_DAYS * DAY_MS)
      .sort((a, b) => (at(a)?.getTime() ?? -1) - (at(b)?.getTime() ?? -1));
    // Enough a day to get round every shelf in the cycle.
    const perDay = Math.max(1, Math.ceil(spots.length / CYCLE_DAYS));
    return { total: spots.length, countedToday, inCycle: inCycle.length, due, perDay };
  }, [tree.data]);

  if (tree.isLoading || summary.total === 0) return null;
  const { total, countedToday, inCycle, due, perDay } = summary;
  const pct = Math.round((inCycle / total) * 100);
  const left = Math.max(0, perDay - countedToday.length);
  return (
    <section className="sh-card" style={{ display: 'grid', gap: 12 }} aria-label="Today's counts">
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="sh-section-title" style={{ margin: 0 }}>Today's counts</h2>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            {countedToday.length} {countedToday.length === 1 ? 'shelf' : 'shelves'} counted today
            {left > 0 ? <span className="sh-muted" style={{ fontWeight: 500, fontSize: 14 }}> · {left} more to stay on track</span> : <span style={{ color: 'var(--accent-success)', fontWeight: 600, fontSize: 14 }}> · on track</span>}
          </div>
        </div>
        <div style={{ minWidth: 200, flex: '0 1 280px' }}>
          <div className="sh-muted">{inCycle} of {total} shelves counted in the last {CYCLE_DAYS} days</div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Shelves counted this month" style={{ height: 8, borderRadius: 999, background: 'var(--bg-input)', marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)' }} />
          </div>
        </div>
      </div>
      {countedToday.length > 0 && (
        <div className="sh-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <span className="sh-muted">Done:</span>
          {countedToday.map(s => <SpotChip key={s.id} address={s.address} name={s.name} isShopFloor={s.isShopFloor} showTag={false} />)}
        </div>
      )}
      {due.length > 0 && (
        <div className="sh-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <span className="sh-muted">Count next:</span>
          {due.slice(0, Math.max(3, left)).map(s => (
            <button key={s.id} type="button" className="btn-secondary" onClick={() => onOpen(s.id)} title={s.lastCountedAt ? `Last counted ${new Date(s.lastCountedAt).toLocaleDateString()}` : 'Never counted'}
              style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="sh-addr">{s.address}</span>{!s.lastCountedAt && <span className="sh-tag muted">new</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CountSheet({ shelf, onDone }) {
  const count = useCountSpot();
  const [scan, setScan] = useState('');
  const [finding, setFinding] = useState(false);
  // Items on the sheet: what the shelf is known to hold, plus anything scanned that it did not.
  const [items, setItems] = useState(() => shelf.items.map(i => ({ ...i, counted: null })));
  useUnsavedWork(items.some(i => i.counted !== null), `a count of ${shelf.spot.address} that is not saved yet`);
  /*
   * "I counted the whole shelf" turns every line not counted into "not on this shelf". It started
   * ticked, so one press of Save with nothing scanned recorded the whole shelf missing (26 Oct). Now it
   * starts unticked, says how many lines it would mark missing, and Save asks once more before it does.
   */
  const [complete, setComplete] = useState(false);
  const [sureMissing, setSureMissing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { setItems(shelf.items.map(i => ({ ...i, counted: null }))); }, [shelf]);

  const bump = (variantId, by) => setItems(list => list.map(i => i.variantId === variantId ? { ...i, counted: Math.max(0, (i.counted ?? 0) + by) } : i));
  const setCount = (variantId, value) => setItems(list => list.map(i => i.variantId === variantId ? { ...i, counted: value === '' ? null : Math.max(0, Math.floor(Number(value)) || 0) } : i));

  const onScan = async (typed) => {
    const known = items.find(i => [i.barcode, i.sku, i.code].some(v => v && v.toLowerCase() === typed.toLowerCase()));
    if (known) { bump(known.variantId, 1); return; }
    setFinding(true);
    try {
      const found = (await api.get('/shelves/find', { params: { q: typed } })).data?.items ?? [];
      const exact = found.filter(i => [i.barcode, i.sku, i.code].some(v => v && v.toLowerCase() === typed.toLowerCase()));
      if (exact.length === 1) {
        const it = exact[0];
        setItems(list => [...list, { ...it, quantity: 0, counted: 1 }]);
        toast(`${it.title} is not recorded on this shelf — added to the count.`, { icon: '➕' });
      } else toast.error(`"${typed}" does not match one item.`);
    } catch (err) { toast.error(err?.message || 'Could not look that up.'); }
    finally { setFinding(false); }
  };

  const countedLines = items.filter(i => i.counted !== null);
  const notCounted = items.filter(i => i.counted === null);
  const sending = useRef(false);
  useEffect(() => { setSureMissing(false); }, [complete, notCounted.length]);
  const submit = () => {
    if (sending.current || count.isPending) return;
    if (complete && notCounted.length > 0 && !sureMissing) { setSureMissing(true); return; }
    sending.current = true;
    count.mutate({ spotId: shelf.spot.id, complete, counts: countedLines.map(i => ({ variantId: i.variantId, counted: i.counted })) }, {
      onSuccess: (r) => setResult(r),
      onSettled: () => { sending.current = false; }
    });
  };

  const nameOf = useMemo(() => new Map(items.map(i => [i.variantId, i])), [items]);

  if (result) {
    return (
      <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
        <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <SpotChip address={result.address} size="lg" showTag={false} />
          <button type="button" className="btn-primary" onClick={onDone} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><RotateCcw size={14} /> Count another shelf</button>
        </div>
        <p style={{ margin: 0 }}>{result.matched} of {result.counted} matched what was recorded{result.issues ? ` · ${result.issues} listed under Problems` : ''}{result.failed ? ` · ${result.failed} could not be saved` : ''}.</p>
        {result.results.map(r => {
          const it = nameOf.get(r.variantId);
          const ok = r.recorded === r.counted && !r.error;
          return (
            <div key={r.variantId} className="sh-row" style={{ alignItems: 'flex-start', padding: 10, borderRadius: 12, background: 'var(--bg-input)' }}>
              {ok ? <CheckCircle2 size={20} color="var(--accent-success)" /> : <TriangleAlert size={20} color="var(--accent-warning)" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{it?.title}</strong> <span className="sh-muted">{it ? itemDetail(it) : ''}</span>
                <span className="sh-muted" style={{ display: 'block' }}>You counted {r.counted} · the system had {r.recorded ?? '—'} · on the shelf now {r.onShelfNow ?? '—'}</span>
                {(r.issue || r.error) && <span style={{ display: 'block', fontSize: 13, color: r.error ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{r.error || r.issue}</span>}
              </span>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className="sh-card" style={{ display: 'grid', gap: 14 }}>
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <SpotChip address={shelf.spot.address} name={shelf.spot.name} colour={shelf.spot.colour} isShopFloor={shelf.spot.isShopFloor} size="lg" />
        <button type="button" className="btn-secondary" onClick={onDone} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><RotateCcw size={14} /> Another shelf</button>
      </div>
      <h2 className="sh-section-title" style={{ margin: 0 }}>2 · Scan every piece on it</h2>
      <ScanInput value={scan} onChange={setScan} onSubmit={onScan} clearOnSubmit busy={finding} placeholder="Scan a tag — each scan counts one" label="Scan a piece" />

      {items.length === 0 ? (
        <EmptyState title="Nothing is recorded on this shelf" text="Scan anything you find on it. If it really is empty, there is nothing to save." />
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map(i => (
            <div key={i.variantId} className="sh-row" style={{ flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, background: 'var(--bg-input)' }}>
              <ItemThumb url={i.imageUrl} size={44} />
              <span style={{ flex: 1, minWidth: 150 }}>
                <strong style={{ display: 'block' }}>{i.title}</strong>
                <span className="sh-muted">{itemDetail(i)}</span>
              </span>
              <span className="sh-stepper">
                <button type="button" aria-label="One fewer" disabled={!i.counted} onClick={() => bump(i.variantId, -1)}><Minus size={16} /></button>
                <input type="number" inputMode="numeric" min={0} value={i.counted ?? ''} placeholder="?" title="Not counted yet: scan it, press +, or type how many" aria-label={`How many ${i.title} you counted`} onChange={(e) => setCount(i.variantId, e.target.value)} />
                <button type="button" aria-label="One more" onClick={() => bump(i.variantId, 1)}><Plus size={16} /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      <label className="sh-row" style={{ gap: 8, cursor: 'pointer', width: 'fit-content' }}>
        <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
        I counted the whole shelf: anything I did not count is not on it
      </label>
      {complete && notCounted.length > 0 && (
        <div role="alert" style={{ fontSize: 13, color: 'var(--accent-warning)', marginTop: -6 }}>
          {notCounted.length} {notCounted.length === 1 ? 'item' : 'items'} not counted ({notCounted.slice(0, 3).map(i => i.title).join(', ')}{notCounted.length > 3 ? '…' : ''}) will be recorded as not on this shelf.
        </div>
      )}
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
        <span className="sh-muted">{countedLines.length} of {items.length} {items.length === 1 ? 'item' : 'items'} counted</span>
        <button type="button" className="btn-primary" onClick={submit} disabled={count.isPending || (!complete && countedLines.length === 0)} style={{ minHeight: 44, display: 'flex', gap: 8, alignItems: 'center' }}>
          {count.isPending ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={18} />}
          {sureMissing ? `Yes, ${notCounted.length} not on the shelf: save` : 'Save count'}
        </button>
      </div>
    </section>
  );
}
