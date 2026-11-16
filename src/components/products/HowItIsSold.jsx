import React from 'react';
import { fromBase, toBase, unitOf } from '../../lib/units';
import { whatOf, useFabricDefault } from './WhatAreYouAdding';

/**
 * "How it is sold" on step 2 of Add product (PLAN-fabrics.md). Only for fabric and material: a garment is sold by the
 * piece, in sizes, and needs nothing here.
 *
 * What the piece IS -- garment or fabric, and which kind of fabric -- is asked on step 1 (WhatAreYouAdding, 16 Nov).
 * This is only how it is sold: by the metre or the packet, the width, the smallest cut, the roll, and whether it is for
 * sale at all. Lengths are typed in metres and kept in centimetres.
 */
export default function HowItIsSold({ value, onChange }) {
  const fabrics = useFabricDefault(value, onChange);
  if (!fabrics?.fabricsOn || whatOf(value, fabrics) !== 'FABRIC') return null;
  const soldBy = value.soldBy ?? 'PIECE';
  const measured = !unitOf(soldBy).whole;
  const set = (patch) => onChange({ ...value, ...patch });
  const metres = (cm) => (cm == null || cm === '' ? '' : String(fromBase(cm, 'METRE')));
  const typedMetres = (text, key) => {
    if (text === '') return set({ [key]: null });
    const cm = toBase(text, 'METRE');
    set({ [key]: cm ?? text }); // a half-typed "2." stays as typed until it is a number
  };
  const kind = fabrics.kinds?.find(k => k.key === value.kind);
  const hint = { fontSize: 11.5, color: 'var(--text-muted)' };

  return (
    <section className="how-sold" aria-label="How it is sold" style={{ display: 'grid', gap: 16, padding: 20, border: '1px solid var(--border-light)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 15 }}>How it is sold</strong>
        {kind && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{kind.label}, chosen on step 1</span>}
      </div>

      <div className="mobile-col" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <span className="input-label" id="sold-by">Sold by</span>
          <div role="radiogroup" aria-labelledby="sold-by" style={{ display: 'inline-flex', border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
            {fabrics.units.map(u => (
              <button key={u.code} type="button" role="radio" aria-checked={soldBy === u.code}
                onClick={() => set({ soldBy: u.code, ...(u.whole ? { minCut: null, rollSize: null, widthCm: null, cutReturnable: false } : { rollSize: value.rollSize ?? fabrics.fabricRollSize }) })}
                style={{ padding: '10px 16px', minHeight: 42, border: 0, fontWeight: 600, cursor: 'pointer', background: soldBy === u.code ? 'var(--brand-solid)' : 'transparent', color: soldBy === u.code ? 'var(--brand-on-solid)' : 'var(--text-primary)' }}>
                {u.one[0].toUpperCase() + u.one.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {measured && (
          <>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label" style={{ marginBottom: 0 }}>Width (optional)</span>
              <input className="input-field" inputMode="numeric" placeholder="e.g. 112" value={value.widthCm ?? ''}
                onChange={e => set({ widthCm: e.target.value === '' ? null : Number(e.target.value) || e.target.value })} />
              <span style={hint}>In centimetres. 44 inches is 112 cm.</span>
            </label>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label" style={{ marginBottom: 0 }}>Minimum cut length</span>
              <input className="input-field" inputMode="decimal" placeholder={metres(fabrics.fabricMinCut)} value={metres(value.minCut)}
                onChange={e => typedMetres(e.target.value, 'minCut')} />
              <span style={hint}>In metres. Empty uses your shop's {metres(fabrics.fabricMinCut)} m.</span>
            </label>
            <label style={{ display: 'grid', gap: 6, width: 150 }}>
              <span className="input-label" style={{ marginBottom: 0 }}>Bought in rolls of</span>
              <input className="input-field" inputMode="decimal" placeholder="e.g. 25" value={metres(value.rollSize)}
                onChange={e => typedMetres(e.target.value, 'rollSize')} />
              <span style={hint}>In metres. "2 rolls" then adds that much.</span>
            </label>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {measured && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 32 }}>
            <input type="checkbox" checked={!!value.cutReturnable} onChange={e => set({ cutReturnable: e.target.checked })} />
            <span>Cut cloth can be returned</span>
          </label>
        )}
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 32 }}>
          <input type="checkbox" checked={value.sellInShop !== false} onChange={e => set({ sellInShop: e.target.checked })} />
          <span>Sell it in my shops</span>
        </label>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {value.sellInShop === false
          ? 'A material you use but do not sell, like thread or lining for stitching. It is counted, but kept out of the online shop, the till and Shopify. Find it later in Products, under Sale or material.'
          : measured
            ? 'Prices below are per metre, in whole rupees. Stock is typed in metres: 12.5 is 12 m 50 cm. Each colour gets its own barcode, price and stock.'
            : `Prices below are per ${unitOf(soldBy).one}. Each colour gets its own barcode, price and stock.`}
      </div>
    </section>
  );
}
