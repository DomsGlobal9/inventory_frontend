import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Wand2, X, Info } from 'lucide-react';
import { useBulkSpots } from '../../hooks/useShelves';
import { useDebounced } from '../../hooks/useCounterSale';

/**
 * "Describe your shop": the same rack tree as Quick create, asked in the words a shop owner uses.
 *
 * Three questions, then a picture of the racks before anything is saved. Each holder may have its
 * own number of shelves (`perParent`), because Rack 1 with six shelves beside Rack 2 with four is
 * what real shops look like.
 *
 * It only ever ADDS. Anything already there is left exactly as it is, and the screen says so in as
 * many words, so answering again later is safe.
 */

const HOLDERS = [
  { kind: 'CUPBOARD', one: 'Cupboard', many: 'Cupboards', code: 'C', inside: 'SHELF', insideOne: 'shelf', insideMany: 'shelves', hint: 'Wall almirahs with shelves' },
  { kind: 'RACK', one: 'Rack', many: 'Racks', code: 'R', inside: 'SHELF', insideOne: 'shelf', insideMany: 'shelves', hint: 'Numbered racks, usually in a godown' },
  { kind: 'RAIL', one: 'Hanging rail', many: 'Hanging rails', code: 'H', inside: 'RAIL_SECTION', insideOne: 'size section', insideMany: 'size sections', hint: 'Clothes on hangers, split by size', sections: ['S', 'M', 'L', 'XL'] },
  { kind: 'COUNTER', one: 'Display counter', many: 'Display counters', code: 'GC', inside: 'DRAWER', insideOne: 'drawer', insideMany: 'drawers', hint: 'A glass counter with drawers' },
  { kind: 'STACK', one: 'Just piles, no racks', many: 'Piles', code: 'P', inside: null, hint: 'Stock kept in piles on the floor or a table' }
];

const PLACES = [
  { id: 'FLOOR', name: 'The shop floor', hint: 'Where customers can see the stock', isShopFloor: true },
  { id: 'STORE', name: 'A back room or godown here', hint: 'In this same building', isShopFloor: false }
];

const MAX_HOLDERS = 40;
const MAX_INSIDE = 50;

export default function DescribeShop({ locationId, locationName, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [place, setPlace] = useState(PLACES[0]);
  const [holder, setHolder] = useState(HOLDERS[0]);
  const [count, setCount] = useState(4);
  const [sameSize, setSameSize] = useState(true);
  const [insideEach, setInsideEach] = useState(4);
  const [perHolder, setPerHolder] = useState([]);

  const preview = useBulkSpots({ silent: true });

  // One number per holder, kept in step with "how many" as it changes.
  useEffect(() => {
    setPerHolder(old => Array.from({ length: Math.max(0, Math.min(MAX_HOLDERS, Number(count) || 0)) }, (_, i) => old[i] ?? insideEach));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const body = useMemo(() => {
    const howMany = Math.max(0, Math.min(MAX_HOLDERS, Number(count) || 0));
    const levels = [{ kind: 'AREA', range: { codes: [place.id] } }];
    if (holder.inside === null) {
      levels.push({ kind: 'STACK', range: { from: 1, to: Math.max(1, howMany), prefix: 'P' } });
    } else {
      levels.push({ kind: holder.kind, range: { from: 1, to: Math.max(1, howMany), prefix: holder.code } });
      if (holder.sections) {
        levels.push({ kind: holder.inside, range: { codes: holder.sections } });
      } else {
        const each = Math.max(0, Math.min(MAX_INSIDE, Number(insideEach) || 0));
        const list = sameSize ? null : perHolder.map(n => Math.max(0, Math.min(MAX_INSIDE, Number(n) || 0)));
        const biggest = list ? Math.max(1, ...list) : each;
        levels.push({
          kind: holder.inside,
          range: { from: 1, to: Math.max(1, biggest) },
          ...(list ? { perParent: list } : {})
        });
      }
    }
    return { locationId, isShopFloor: place.isShopFloor, levels };
  }, [locationId, place, holder, count, sameSize, insideEach, perHolder]);

  const settled = useDebounced(JSON.stringify(body), 350);
  useEffect(() => {
    if (step !== 3 || !locationId) return;
    preview.mutate({ ...JSON.parse(settled), preview: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, step]);

  const save = useBulkSpots();
  const result = preview.data;
  const problem = preview.error?.message;
  const howMany = Math.max(0, Math.min(MAX_HOLDERS, Number(count) || 0));

  return (
    <div className="sh-card" style={{ display: 'grid', gap: 18 }}>
      <div className="sh-row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Wand2 size={18} /> Describe {locationName || 'this place'}
        </h2>
        <button type="button" className="sh-iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="sh-row" style={{ gap: 6 }} aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map(n => (
          <span key={n} style={{
            height: 6, flex: 1, borderRadius: 999,
            background: n <= step ? 'var(--accent-primary, #16a34a)' : 'var(--border-light)'
          }} />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>Where do you keep the stock here?</h3>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {PLACES.map(p => (
              <button key={p.id} type="button" onClick={() => setPlace(p)}
                className={`sh-list-btn${place.id === p.id ? ' selected' : ''}`}
                style={{ display: 'grid', gap: 2, border: '1px solid var(--border-light)', alignContent: 'start', textAlign: 'left' }}>
                <strong>{p.name}</strong>
                <span className="sh-muted" style={{ fontSize: 12 }}>{p.hint}</span>
              </button>
            ))}
          </div>
          <p className="sh-muted" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              A godown in <strong>another building</strong> is its own place in ScaleEzy, not part of this one.
              Add it in <strong>Settings → Locations</strong>, then describe it there.
              Do that if you write it down when stock goes from there to the shop; if staff simply carry
              things across, keep it here as a back room.
            </span>
          </p>
          <p className="sh-muted" style={{ margin: 0 }}>Till sales take stock from shop-floor shelves first.</p>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>What holds the stock there?</h3>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {HOLDERS.map(h => (
              <button key={h.kind} type="button" onClick={() => setHolder(h)}
                className={`sh-list-btn${holder.kind === h.kind ? ' selected' : ''}`}
                style={{ display: 'grid', gap: 2, border: '1px solid var(--border-light)', alignContent: 'start', textAlign: 'left' }}>
                <strong>{h.one}</strong>
                <span className="sh-muted" style={{ fontSize: 12 }}>{h.hint}</span>
              </button>
            ))}
          </div>

          <label style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
            <span>How many {holder.many.toLowerCase()} are there?</span>
            <input className="input-field" type="number" min={1} max={MAX_HOLDERS} value={count}
              onChange={(e) => setCount(e.target.value)} />
          </label>

          {holder.inside && !holder.sections && (
            <div style={{ display: 'grid', gap: 10 }}>
              <label className="sh-row" style={{ gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={sameSize} onChange={(e) => setSameSize(e.target.checked)} />
                <span>Every {holder.one.toLowerCase()} has the same number of {holder.insideMany}</span>
              </label>
              {sameSize ? (
                <label style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
                  <span>How many {holder.insideMany} in each?</span>
                  <input className="input-field" type="number" min={0} max={MAX_INSIDE} value={insideEach}
                    onChange={(e) => setInsideEach(e.target.value)} />
                </label>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  <span className="sh-muted">How many {holder.insideMany} in each one?</span>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {Array.from({ length: howMany }, (_, i) => (
                      <label key={i} className="sh-row" style={{ gap: 6 }}>
                        <span className="sh-addr" style={{ minWidth: 42 }}>{holder.code}{i + 1}</span>
                        <input className="input-field" type="number" min={0} max={MAX_INSIDE} style={{ width: 70 }}
                          aria-label={`${holder.one} ${i + 1}: how many ${holder.insideMany}`}
                          value={perHolder[i] ?? insideEach}
                          onChange={(e) => setPerHolder(old => old.map((v, j) => (j === i ? e.target.value : v)))} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {holder.sections && (
            <p className="sh-muted" style={{ margin: 0 }}>Each rail is split into {holder.sections.join(', ')}. Change any of this later in Racks &amp; shelves.</p>
          )}
          {!holder.inside && (
            <p className="sh-muted" style={{ margin: 0 }}>Each pile holds stock by itself, with nothing inside it.</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>This is what will be made</h3>
          {preview.isPending && <span className="sh-muted"><Loader2 size={14} className="animate-spin" /> Working it out…</span>}
          {problem && <span style={{ color: 'var(--accent-danger)' }}>{problem}</span>}
          {result && !problem && (
            <>
              <Picture result={result} holder={holder} place={place} />
              <strong>
                {result.create === 0 ? 'Everything you described is already here' : `${result.create} new ${result.create === 1 ? 'spot' : 'spots'}`}
                {result.alreadyThere ? ` · ${result.alreadyThere} already here, left as ${result.alreadyThere === 1 ? 'it is' : 'they are'}` : ''}
              </strong>
              {result.conflictCount > 0 && (
                <div style={{ display: 'grid', gap: 4, background: 'var(--bg-input)', borderRadius: 10, padding: 10 }}>
                  <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
                    {result.conflictCount} left out{result.skipped ? `, and ${result.skipped} inside ${result.conflictCount === 1 ? 'it' : 'them'}` : ''}
                  </span>
                  {result.conflicts?.map(c => (
                    <span key={c.address} className="sh-muted" style={{ fontSize: 13 }}>
                      <span className="sh-addr">{c.address}</span> — {c.reason}
                    </span>
                  ))}
                </div>
              )}
              <p className="sh-muted" style={{ margin: 0 }}>
                This only adds. Nothing here is renamed, moved or removed, so you can answer these questions again
                later. To take something away, use <strong>Racks &amp; shelves</strong>.
              </p>
            </>
          )}
        </div>
      )}

      <div className="sh-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ArrowLeft size={15} /> {step === 1 ? 'Cancel' : 'Back'}
        </button>
        {step < 3 ? (
          <button type="button" className="btn-primary" onClick={() => setStep(step + 1)} disabled={step === 2 && howMany < 1}
            style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Next <ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" className="btn-primary" style={{ minWidth: 160, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}
            disabled={!result || !!problem || result.create === 0 || save.isPending || preview.isPending}
            onClick={() => save.mutate({ ...body, locationId }, { onSuccess: (r) => { if (r.saved) onCreated?.(r); } })}>
            {save.isPending && <Loader2 size={16} className="animate-spin" />}
            Create {result?.create ? result.create : ''}
          </button>
        )}
      </div>
    </div>
  );
}

/** The racks drawn side by side, so the shape is recognisable before anything is saved. */
function Picture({ result, holder, place }) {
  const made = new Set(result.addresses ?? []);
  const byHolder = new Map();
  for (const address of [...(result.addresses ?? [])]) {
    const parts = address.split('-');
    if (parts.length < 2) continue;
    const key = parts.slice(0, 2).join('-');
    if (!byHolder.has(key)) byHolder.set(key, []);
    if (parts.length >= 3) byHolder.get(key).push(parts.slice(2).join('-'));
  }
  const holders = [...byHolder.entries()];
  if (holders.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }} aria-label="A picture of what will be made">
      {holders.slice(0, 20).map(([key, insides]) => (
        <div key={key} style={{ minWidth: 92, display: 'grid', gap: 4, alignContent: 'start' }}>
          <span className="sh-addr" style={{ textAlign: 'center', fontSize: 12 }}>{key.split('-')[1]}</span>
          <div style={{ display: 'grid', gap: 3, border: '1px solid var(--border-light)', borderRadius: 8, padding: 4 }}>
            {insides.length === 0 && <span className="sh-muted" style={{ fontSize: 11, textAlign: 'center', padding: '8px 0' }}>holds stock</span>}
            {insides.slice(0, 12).map(inside => (
              <span key={inside} style={{
                fontSize: 11, textAlign: 'center', padding: '5px 2px', borderRadius: 5,
                background: made.has(`${key}-${inside}`) ? 'var(--bg-input)' : 'transparent'
              }}>{inside}</span>
            ))}
            {insides.length > 12 && <span className="sh-muted" style={{ fontSize: 11, textAlign: 'center' }}>+{insides.length - 12}</span>}
          </div>
          <span className="sh-muted" style={{ fontSize: 11, textAlign: 'center' }}>
            {insides.length ? `${insides.length} ${insides.length === 1 ? holder.insideOne : holder.insideMany}` : ''}
          </span>
        </div>
      ))}
      {holders.length > 20 && <span className="sh-muted" style={{ alignSelf: 'center' }}>and {holders.length - 20} more</span>}
      <span className="sh-muted" style={{ alignSelf: 'flex-end', fontSize: 11 }}>{place.isShopFloor ? 'Shop floor' : 'Back room'}</span>
    </div>
  );
}
