import React from 'react';
import { useFabrics } from '../../hooks/useFabrics';
import { fromBase, toBase, unitOf } from '../../lib/units';

/**
 * "How it is sold" on Add product (13 Nov 2026, PLAN-fabrics.md; mockup 2). Shown only while the shop sells by the
 * metre (Settings → Products → Fabrics); otherwise nothing changes and every product is sold by the piece.
 *
 * Kind first: Fabric, Lining, Border, Lace and the like set "Sold by" to Metre for you, Buttons and Hooks to
 * Packet; everything else stays Piece. Lengths are typed in metres and kept in centimetres.
 */
const chip = (on) => ({
  border: `1px solid ${on ? 'var(--brand-solid, #A6D92B)' : 'var(--border-color, #e5e7eb)'}`,
  background: on ? 'rgba(166, 217, 43, 0.16)' : 'transparent',
  color: 'var(--text-primary)', borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
  fontWeight: on ? 700 : 500
});

export default function HowItIsSold({ value, onChange }) {
  const { data: fabrics } = useFabrics();
  if (!fabrics?.fabricsOn) return null;
  const soldBy = value.soldBy ?? 'PIECE';
  const measured = !unitOf(soldBy).whole;
  const set = (patch) => onChange({ ...value, ...patch });
  const metres = (cm) => (cm == null || cm === '' ? '' : String(fromBase(cm, 'METRE')));
  const typedMetres = (text, key) => {
    if (text === '') return set({ [key]: null });
    const cm = toBase(text, 'METRE');
    set({ [key]: cm ?? text }); // a half-typed "2." stays as typed until it is a number
  };

  const pickKind = (k) => {
    if (value.kind === k.key) return set({ kind: null });
    // The unit follows the kind, unless the owner already chose one.
    const offered = fabrics.units.map(u => u.code);
    const next = offered.includes(k.soldBy) ? k.soldBy : 'PIECE';
    set({ kind: k.key, soldBy: next, rollSize: next === 'METRE' ? (value.rollSize ?? fabrics.fabricRollSize) : null });
  };

  return (
    <section aria-label="How it is sold" style={{ display: 'grid', gap: 16, padding: 20, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 14 }}>
      <div>
        <div className="input-label" style={{ marginBottom: 8 }}>Kind</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fabrics.kinds.map(k => (
            <button key={k.key} type="button" style={chip(value.kind === k.key)} aria-pressed={value.kind === k.key} onClick={() => pickKind(k)}>{k.label}</button>
          ))}
        </div>
      </div>

      <div className="mobile-col" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div className="input-label" style={{ marginBottom: 8 }}>Sold by</div>
          <div role="radiogroup" aria-label="Sold by" style={{ display: 'inline-flex', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
            {fabrics.units.map(u => (
              <button key={u.code} type="button" role="radio" aria-checked={soldBy === u.code}
                onClick={() => set({ soldBy: u.code, ...(u.whole ? { minCut: null, rollSize: null } : {}) })}
                style={{ padding: '9px 16px', border: 0, fontWeight: 600, cursor: 'pointer', background: soldBy === u.code ? 'var(--brand-deep, #164B1E)' : 'transparent', color: soldBy === u.code ? '#fff' : 'var(--text-primary)' }}>
                {u.one[0].toUpperCase() + u.one.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {measured && (
          <>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label">Width (optional)</span>
              <input className="input-field" inputMode="numeric" placeholder="e.g. 112" value={value.widthCm ?? ''}
                onChange={e => set({ widthCm: e.target.value === '' ? null : Number(e.target.value) || e.target.value })} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>centimetres (44 inches = 112 cm)</span>
            </label>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label">Smallest cut</span>
              <input className="input-field" inputMode="decimal" placeholder={metres(fabrics.fabricMinCut)} value={metres(value.minCut)}
                onChange={e => typedMetres(e.target.value, 'minCut')} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>metres; empty = the shop's {metres(fabrics.fabricMinCut)} m</span>
            </label>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label">Bought in rolls of</span>
              <input className="input-field" inputMode="decimal" placeholder="e.g. 25" value={metres(value.rollSize)}
                onChange={e => typedMetres(e.target.value, 'rollSize')} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>metres; "2 rolls" then adds that much</span>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', alignSelf: 'center' }}>
              <input type="checkbox" checked={!!value.cutReturnable} onChange={e => set({ cutReturnable: e.target.checked })} />
              <span>Cut cloth can be returned</span>
            </label>
          </>
        )}
      </div>
      {measured && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Prices below are per metre, in whole rupees. Stock is typed in metres (12.5 = 12 m 50 cm). Each colour is its own
          variant with its own barcode, price and stock.
        </div>
      )}
    </section>
  );
}
