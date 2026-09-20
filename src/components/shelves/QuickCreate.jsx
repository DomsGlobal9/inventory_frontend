import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wand2, Loader2, X } from 'lucide-react';
import Select from '../common/Select';
import { useBulkSpots, SPOT_KINDS, kindLabel } from '../../hooks/useShelves';
import { useDebounced } from '../../hooks/useCounterSale';

/**
 * Quick create: "area STORE, racks R01-R05, shelves 1-4" in one go, with a live preview of the
 * addresses before anything is saved. Starts from a preset shaped like a real shop.
 */

const numbers = (from, to, prefix = '', pad = 0) => ({ mode: 'numbers', from, to, prefix, pad });
const letters = (from, to, prefix = '') => ({ mode: 'letters', letterFrom: from, letterTo: to, prefix });
const list = (codes) => ({ mode: 'list', codes: codes.join(', ') });

export const PRESETS = [
  {
    id: 'saree', name: 'Saree boutique', hint: 'Wall cupboards with shelves on the shop floor',
    shopFloor: true,
    levels: [{ kind: 'AREA', ...list(['FLOOR']) }, { kind: 'CUPBOARD', ...numbers(1, 4, 'C') }, { kind: 'SHELF', ...numbers(1, 4) }]
  },
  {
    id: 'readymade', name: 'Readymade', hint: 'Hanging rails split by size',
    shopFloor: true,
    levels: [{ kind: 'AREA', ...list(['FLOOR']) }, { kind: 'RAIL', ...numbers(1, 3, 'R') }, { kind: 'RAIL_SECTION', ...list(['S', 'M', 'L', 'XL']) }]
  },
  {
    id: 'counter', name: 'Display counter', hint: 'A glass counter with drawers',
    shopFloor: true,
    levels: [{ kind: 'AREA', ...list(['FLOOR']) }, { kind: 'COUNTER', ...list(['GC']) }, { kind: 'DRAWER', ...numbers(1, 4, 'D') }]
  },
  {
    id: 'godown', name: 'Back room / godown', hint: 'Numbered racks with shelves, off the shop floor',
    shopFloor: false,
    levels: [{ kind: 'AREA', ...list(['STORE']) }, { kind: 'RACK', ...numbers(1, 5, 'R', 2) }, { kind: 'SHELF', ...numbers(1, 4) }]
  },
  {
    id: 'cartons', name: 'Godown with cartons', hint: 'Racks, shelves and boxes on each shelf',
    shopFloor: false,
    levels: [{ kind: 'AREA', ...list(['STORE']) }, { kind: 'RACK', ...numbers(1, 3, 'R', 2) }, { kind: 'SHELF', ...numbers(1, 3) }, { kind: 'BOX', ...letters('A', 'C') }]
  }
];

const toRange = (level) => {
  if (level.mode === 'numbers') return { from: Number(level.from), to: Number(level.to), pad: Number(level.pad) || 0, prefix: level.prefix || undefined };
  if (level.mode === 'letters') return { letterFrom: level.letterFrom, letterTo: level.letterTo, prefix: level.prefix || undefined };
  return { codes: String(level.codes).split(/[,\s]+/).map(c => c.trim()).filter(Boolean) };
};

export default function QuickCreate({ locationId, parent, onClose, onCreated }) {
  const maxLevels = 4 - (parent?.depth ?? 0);
  const [presetId, setPresetId] = useState(parent ? 'custom' : 'saree');
  const [shopFloor, setShopFloor] = useState(true);
  const [levels, setLevels] = useState(() => parent ? [{ kind: 'SHELF', ...numbers(1, 4) }] : PRESETS[0].levels);
  const preview = useBulkSpots({ silent: true });
  const save = useBulkSpots();

  const applyPreset = (id) => {
    setPresetId(id);
    const p = PRESETS.find(x => x.id === id);
    if (p) { setLevels(p.levels.map(l => ({ ...l }))); setShopFloor(p.shopFloor); }
  };

  const body = useMemo(() => ({
    locationId,
    parentId: parent?.id ?? undefined,
    ...(parent ? {} : { isShopFloor: shopFloor }),
    levels: levels.map(l => ({ kind: l.kind, range: toRange(l) }))
  }), [locationId, parent, shopFloor, levels]);
  const settled = useDebounced(JSON.stringify(body), 400);

  useEffect(() => {
    if (!locationId || levels.length === 0) return;
    preview.mutate({ ...JSON.parse(settled), preview: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  const setLevel = (i, patch) => { setPresetId('custom'); setLevels(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); };
  const result = preview.data;
  const problem = preview.error?.message;

  return (
    <div className="sh-card" style={{ display: 'grid', gap: 16 }}>
      <div className="sh-row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}><Wand2 size={18} /> Quick create {parent ? <>inside <span className="sh-addr">{parent.address}</span></> : ''}</h2>
        <button type="button" className="sh-iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>

      {!parent && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h3 className="sh-section-title" style={{ margin: 0 }}>Start from</h3>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
            {PRESETS.map(p => (
              <button key={p.id} type="button" onClick={() => applyPreset(p.id)} className={`sh-list-btn${presetId === p.id ? ' selected' : ''}`}
                style={{ display: 'grid', gap: 2, border: '1px solid var(--border-light)', alignContent: 'start' }}>
                <strong>{p.name}</strong>
                <span className="sh-muted" style={{ fontSize: 12 }}>{p.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        <h3 className="sh-section-title" style={{ margin: 0 }}>Levels</h3>
        {levels.map((l, i) => (
          <div key={i} className="sh-level">
            <span className="sh-level-n" aria-hidden>{i + 1}</span>
            <div className="sh-level-kind">
              <Select className="input-field" value={l.kind} onChange={(e) => setLevel(i, { kind: e.target.value })} aria-label={`Level ${i + 1} kind`}>
                {SPOT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </div>
            <div className="sh-level-mode">
              <Select className="input-field" value={l.mode} aria-label={`Level ${i + 1} naming`} onChange={(e) => {
                const mode = e.target.value;
                setLevel(i, mode === 'numbers' ? numbers(1, 4) : mode === 'letters' ? letters('A', 'D') : list(['A']));
              }}>
                <option value="numbers">Numbered</option>
                <option value="letters">Lettered</option>
                <option value="list">Named</option>
              </Select>
            </div>
            <div className="sh-row sh-level-codes" style={{ gap: 6, flexWrap: 'wrap' }}>
              {l.mode === 'numbers' && (<>
                <input className="input-field" style={{ width: 64 }} value={l.prefix} maxLength={6} placeholder="Prefix" aria-label="Prefix" onChange={(e) => setLevel(i, { prefix: e.target.value.toUpperCase() })} />
                <input className="input-field" style={{ width: 64 }} type="number" min={0} value={l.from} aria-label="From" onChange={(e) => setLevel(i, { from: e.target.value })} />
                <span className="sh-muted">to</span>
                <input className="input-field" style={{ width: 64 }} type="number" min={0} value={l.to} aria-label="To" onChange={(e) => setLevel(i, { to: e.target.value })} />
                <label className="sh-row sh-muted" style={{ gap: 4 }}><input type="checkbox" checked={Number(l.pad) === 2} onChange={(e) => setLevel(i, { pad: e.target.checked ? 2 : 0 })} /> 01, 02…</label>
              </>)}
              {l.mode === 'letters' && (<>
                <input className="input-field" style={{ width: 64 }} value={l.prefix} maxLength={6} placeholder="Prefix" aria-label="Prefix" onChange={(e) => setLevel(i, { prefix: e.target.value.toUpperCase() })} />
                <input className="input-field" style={{ width: 52 }} value={l.letterFrom} maxLength={1} aria-label="First letter" onChange={(e) => setLevel(i, { letterFrom: e.target.value.toUpperCase() })} />
                <span className="sh-muted">to</span>
                <input className="input-field" style={{ width: 52 }} value={l.letterTo} maxLength={1} aria-label="Last letter" onChange={(e) => setLevel(i, { letterTo: e.target.value.toUpperCase() })} />
              </>)}
              {l.mode === 'list' && (
                <input className="input-field" style={{ flex: 1, minWidth: 140 }} value={l.codes} placeholder="FLOOR, GODOWN" aria-label="Codes, separated by commas" onChange={(e) => setLevel(i, { codes: e.target.value.toUpperCase() })} />
              )}
            </div>
            <button type="button" className="sh-iconbtn" aria-label={`Remove level ${i + 1}`} disabled={levels.length === 1} onClick={() => { setPresetId('custom'); setLevels(ls => ls.filter((_, j) => j !== i)); }}><Trash2 size={16} /></button>
          </div>
        ))}
        {levels.length < maxLevels && (
          <button type="button" className="btn-secondary" style={{ justifySelf: 'start', display: 'flex', gap: 6, alignItems: 'center' }}
            onClick={() => { setPresetId('custom'); setLevels(ls => [...ls, { kind: 'BOX', ...letters('A', 'B') }]); }}>
            <Plus size={14} /> Add a level inside
          </button>
        )}
        {!parent && levels[0] && (
          <div className="sh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="sh-muted">This {kindLabel(levels[0].kind).toLowerCase()} is</span>
            <button type="button" className={shopFloor ? 'btn-primary' : 'btn-secondary'} onClick={() => setShopFloor(true)} style={{ padding: '6px 12px' }}>On the shop floor</button>
            <button type="button" className={!shopFloor ? 'btn-primary' : 'btn-secondary'} onClick={() => setShopFloor(false)} style={{ padding: '6px 12px' }}>In the back room</button>
          </div>
        )}
        {!parent && <p className="sh-muted" style={{ margin: 0 }}>Till sales take stock from shop-floor shelves first.</p>}
      </div>

      <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: 14, display: 'grid', gap: 8 }} aria-live="polite">
        {preview.isPending ? <span className="sh-muted"><Loader2 size={14} className="animate-spin" /> Working it out…</span>
          : problem ? <span style={{ color: 'var(--accent-danger)' }}>{problem}</span>
          : result ? (<>
            <strong>{result.create === 0 ? 'Nothing new to create' : `${result.create} new ${result.create === 1 ? 'spot' : 'spots'}`}{result.alreadyThere ? ` · ${result.alreadyThere} already there` : ''}</strong>
            {result.addresses?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.addresses.map(a => <span key={a} className="sh-chip sh-addr">{a}</span>)}
                {result.more > 0 && <span className="sh-muted">and {result.more} more</span>}
              </div>
            )}
            {/* Something in the way stops that rack alone; the rest is still created. */}
            {result.conflictCount > 0 && (
              <div style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
                  {result.conflictCount} left out{result.skipped ? `, and ${result.skipped} inside ${result.conflictCount === 1 ? 'it' : 'them'}` : ''}
                </span>
                {result.conflicts?.map(c => (
                  <span key={c.address} className="sh-muted" style={{ fontSize: 13 }}><span className="sh-addr">{c.address}</span> — {c.reason}</span>
                ))}
                {result.conflictCount > (result.conflicts?.length ?? 0) && (
                  <span className="sh-muted" style={{ fontSize: 13 }}>and {result.conflictCount - result.conflicts.length} more</span>
                )}
              </div>
            )}
            {result.notes?.length > 0 && result.notes.map(n => (
              <span key={n.address} className="sh-muted" style={{ fontSize: 13 }}><span className="sh-addr">{n.address}</span> — {n.note}</span>
            ))}
          </>) : null}
      </div>

      <div className="sh-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!result || !!problem || result.create === 0 || save.isPending || preview.isPending}
          onClick={() => save.mutate(body, { onSuccess: (r) => { if (r.saved) onCreated?.(); } })}
          style={{ minWidth: 150, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {save.isPending && <Loader2 size={16} className="animate-spin" />} Create {result?.create ? result.create : ''}
        </button>
      </div>
      <style>{`
        .sh-level { display: grid; gap: 8px; align-items: center; padding: 10px; border: 1px solid var(--border-light); border-radius: 12px;
          grid-template-columns: 26px minmax(0, 1fr) minmax(0, 1fr) auto; grid-template-areas: "n kind mode del" "n codes codes codes"; }
        .sh-level > .sh-level-n { grid-area: n; align-self: start; margin-top: 8px; width: 22px; height: 22px; border-radius: 999px; background: var(--bg-input); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--text-secondary); }
        .sh-level > .sh-level-kind { grid-area: kind; min-width: 0; }
        .sh-level > .sh-level-mode { grid-area: mode; min-width: 0; }
        .sh-level > .sh-level-codes { grid-area: codes; }
        .sh-level > .sh-iconbtn { grid-area: del; }
      `}</style>
    </div>
  );
}
