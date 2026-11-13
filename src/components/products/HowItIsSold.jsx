import React, { useEffect, useState } from 'react';
import { useFabrics } from '../../hooks/useFabrics';
import { fromBase, toBase, unitOf } from '../../lib/units';

/**
 * "How it is sold" on Add product (13 Nov 2026, PLAN-fabrics.md; mockup 2). Shown only while the shop sells by the
 * metre (Settings → Products → Fabrics); otherwise nothing changes and every product is sold by the piece.
 *
 * Kind first: Fabric, Lining, Border, Lace and the like set "Sold by" to Metre for you, Buttons and Hooks to
 * Packet; everything else stays Piece. Lengths are typed in metres and kept in centimetres.
 */
// The kinds most shops use, shown first; the rest are one tap away ("More kinds").
const COMMON_KINDS = ['FABRIC', 'LINING', 'BORDER', 'LACE_TRIM', 'BUTTONS', 'OTHER'];

const chip = (on) => ({
  border: `1px solid ${on ? 'var(--brand-solid, #A6D92B)' : 'var(--border-color, #e5e7eb)'}`,
  background: on ? 'rgba(166, 217, 43, 0.16)' : 'transparent',
  color: 'var(--text-primary)', borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer',
  fontWeight: on ? 700 : 500
});

export default function HowItIsSold({ value, onChange }) {
  const { data: fabrics } = useFabrics();
  const sells = fabrics?.sells ?? null;
  const [allKinds, setAllKinds] = useState(false);
  // A fabric shop starts every new product as fabric, by the metre (PLAN-onboarding-setup.md).
  useEffect(() => {
    if (!fabrics?.fabricsOn || sells !== 'FABRICS' || value.kind || (value.soldBy ?? 'PIECE') !== 'PIECE') return;
    const fabric = fabrics.kinds?.find(k => k.key === 'FABRIC');
    if (fabric) onChange({ ...value, kind: 'FABRIC', soldBy: 'METRE', rollSize: value.rollSize ?? fabrics.fabricRollSize });
  }, [fabrics?.fabricsOn, sells]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // A shop that sells both is asked first: a garment, or fabric? A garment needs nothing more here.
  const what = value.what ?? ((value.kind || (value.soldBy ?? 'PIECE') !== 'PIECE') ? 'FABRIC' : null);
  const chooseWhat = (w) => {
    if (w === 'GARMENT') return onChange({ ...value, what: 'GARMENT', kind: null, soldBy: 'PIECE', minCut: null, rollSize: null, widthCm: null });
    onChange({ ...value, what: 'FABRIC', kind: 'FABRIC', soldBy: 'METRE', rollSize: value.rollSize ?? fabrics.fabricRollSize });
  };
  const showDetails = sells !== 'BOTH' || what === 'FABRIC';
  const typeRow = (on, first) => ({
    display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '12px 14px', cursor: 'pointer', border: 0,
    borderTop: first ? 0 : '1px solid var(--border-color, #e5e7eb)', color: 'var(--text-primary)',
    background: on ? 'rgba(166, 217, 43, 0.1)' : 'transparent', boxShadow: on ? 'inset 3px 0 0 #164B1E' : 'none'
  });
  const radioDot = (on) => ({ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `1.5px solid ${on ? '#164B1E' : 'var(--text-muted)'}`, boxShadow: on ? 'inset 0 0 0 3px var(--bg-card), inset 0 0 0 9px #164B1E' : 'none' });

  return (
    <section className="how-sold" aria-label="How it is sold" style={{ display: 'grid', gap: 16, padding: 20, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 12 }}>
      {sells === 'BOTH' && (
        <div>
          <div className="input-label" style={{ marginBottom: 8 }}>Product type</div>
          <div role="radiogroup" aria-label="Product type" style={{ border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
            {[['GARMENT', 'Ready-made garment', 'Sold by the piece, in sizes'], ['FABRIC', 'Fabric or material', 'Sold by the metre or by the packet']].map(([key, title, line], i) => (
              <button key={key} type="button" role="radio" aria-checked={what === key} style={typeRow(what === key, i === 0)} onClick={() => chooseWhat(key)}>
                <span aria-hidden="true" style={radioDot(what === key)} />
                <span><strong style={{ display: 'block', fontSize: 14 }}>{title}</strong><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{line}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {showDetails && (<>
      <div>
        <div className="input-label" style={{ marginBottom: 8 }}>Kind</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {fabrics.kinds.filter(k => allKinds || COMMON_KINDS.includes(k.key) || value.kind === k.key).map(k => (
            <button key={k.key} type="button" style={{ ...chip(value.kind === k.key), borderRadius: 8, textAlign: 'center' }} aria-pressed={value.kind === k.key} onClick={() => pickKind(k)}>{k.label}</button>
          ))}
          {fabrics.kinds.length > COMMON_KINDS.length && (
            <button type="button" onClick={() => setAllKinds(v => !v)} aria-expanded={allKinds}
              style={{ border: '1px dashed var(--border-color, #e5e7eb)', borderRadius: 8, background: 'none', padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
              {allKinds ? 'Fewer kinds' : `More kinds (${fabrics.kinds.length - COMMON_KINDS.length})`}
            </button>
          )}
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
              <span className="input-label">Minimum cut length</span>
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
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', alignSelf: 'center' }}
          title="Untick for a material you use but never sell: threads, beads, lining for stitching. It is counted, but kept out of the online shop, the till and Shopify.">
          <input type="checkbox" checked={value.sellInShop !== false} onChange={e => set({ sellInShop: e.target.checked })} />
          <span>Sell it in my shops</span>
        </label>
      </div>
      {value.sellInShop === false && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          A material: counted and used, but never in the online shop, the till or Shopify. Find it later under Products → Sale or material.
        </div>
      )}
      {measured && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Prices below are per metre, in whole rupees. Stock is typed in metres (12.5 = 12 m 50 cm). Each colour is its own
          variant with its own barcode, price and stock.
        </div>
      )}
      </>)}
    </section>
  );
}
