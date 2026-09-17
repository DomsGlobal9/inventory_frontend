import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardCheck, Loader2, RotateCcw, Plus, Minus, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useCountSpot, isLabelScan, looksLikeAddress, resolveSpot } from '../../hooks/useShelves';
import { api } from '../../lib/api';
import { ShelvesLayout, ScanInput, SpotChip, ItemThumb, EmptyState, itemDetail } from '../../components/shelves/ShelfBits';
import SpotPicker from '../../components/shelves/SpotPicker';

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
    return <ShelvesLayout title="Count a shelf" icon={ClipboardCheck}><div className="sh-card"><EmptyState icon={ClipboardCheck} title="You cannot count shelves" text="Ask whoever manages your team for the permission to put stock away and move it." /></div></ShelvesLayout>;
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

  return (
    <ShelvesLayout title="Count a shelf" icon={ClipboardCheck} subtitle="Scan the shelf, then every piece on it. Differences are shown to the shop, never hidden.">
      {shelf ? (
        <CountSheet key={shelf.spot.id} shelf={shelf} onDone={() => setShelf(null)} />
      ) : (
        <div className="sh-grid-2">
          <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
            <h2 className="sh-section-title" style={{ margin: 0 }}>1 · Which shelf</h2>
            <ScanInput value={text} onChange={setText} onSubmit={openShelf} busy={busy} placeholder="Scan the shelf label" label="Scan the shelf you are counting" />
          </section>
          <section className="sh-card" style={{ display: 'grid', gap: 12 }}>
            <h2 className="sh-section-title" style={{ margin: 0 }}>Or choose it</h2>
            <SpotPicker locationId={locationId} onChange={async (s) => { setBusy(true); try { setShelf((await api.get(`/shelves/spots/${s.id}`)).data); } finally { setBusy(false); } }} />
          </section>
        </div>
      )}
    </ShelvesLayout>
  );
}

function CountSheet({ shelf, onDone }) {
  const count = useCountSpot();
  const [scan, setScan] = useState('');
  const [finding, setFinding] = useState(false);
  // Items on the sheet: what the shelf is known to hold, plus anything scanned that it did not.
  const [items, setItems] = useState(() => shelf.items.map(i => ({ ...i, counted: null })));
  const [complete, setComplete] = useState(true);
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
  const sending = useRef(false);
  const submit = () => {
    if (sending.current || count.isPending) return;
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
        <p style={{ margin: 0 }}>{result.matched} of {result.counted} matched{result.issues ? ` · ${result.issues} raised as shelf issues` : ''}{result.failed ? ` · ${result.failed} could not be recorded` : ''}.</p>
        {result.results.map(r => {
          const it = nameOf.get(r.variantId);
          const ok = r.recorded === r.counted && !r.error;
          return (
            <div key={r.variantId} className="sh-row" style={{ alignItems: 'flex-start', padding: 10, borderRadius: 12, background: 'var(--bg-input)' }}>
              {ok ? <CheckCircle2 size={20} color="var(--accent-success)" /> : <TriangleAlert size={20} color="var(--accent-warning)" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{it?.title}</strong> <span className="sh-muted">{it ? itemDetail(it) : ''}</span>
                <span className="sh-muted" style={{ display: 'block' }}>Counted {r.counted} · was recorded {r.recorded ?? '—'} · on the shelf now {r.onShelfNow ?? '—'}</span>
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
        <EmptyState title="Nothing recorded here" text="Scan what you find. If the shelf is empty, press Save count." />
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
                <input type="number" inputMode="numeric" min={0} value={i.counted ?? ''} placeholder="–" aria-label={`Counted ${i.title}`} onChange={(e) => setCount(i.variantId, e.target.value)} />
                <button type="button" aria-label="One more" onClick={() => bump(i.variantId, 1)}><Plus size={16} /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      <label className="sh-row" style={{ gap: 8, cursor: 'pointer', width: 'fit-content' }}>
        <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
        I counted the whole shelf (anything not counted is not there)
      </label>
      <div className="sh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
        <span className="sh-muted">{countedLines.length} of {items.length} counted</span>
        <button type="button" className="btn-primary" onClick={submit} disabled={count.isPending || (!complete && countedLines.length === 0)} style={{ minHeight: 44, display: 'flex', gap: 8, alignItems: 'center' }}>
          {count.isPending ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={18} />} Save count
        </button>
      </div>
    </section>
  );
}
