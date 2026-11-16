import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFabrics } from '../../hooks/useFabrics';
import { useDialog } from '../../hooks/useDialog';

/**
 * What the piece IS, on step 1 of Add product (16 Nov). The owner turned fabrics on, pressed Add product and was asked
 * nothing: "garment or fabric" sat on step 2, after a whole page of garment questions.
 *
 *  - Fabrics on, and not a fabric-only shop: a pop-up asks first, before the form ("What are you adding?"), and the form then fits
 *    the answer. A small line on the form says what was chosen, with Change.
 *  - Fabric-only shop: never asked; every new product starts as fabric, by the metre.
 *  - Fabrics off: nothing is asked and nothing is shown, exactly as before.
 *  - For fabric, the kind is chosen on the form (fabric, lining, lace, buttons...): it sets how it is sold (metre or
 *    packet), which step 2 then shows.
 *
 * Kept in productData.selling, the same object step 2 and the save already read.
 */

// The kinds most shops use, shown first; the rest are one tap away.
const COMMON_KINDS = ['FABRIC', 'LINING', 'BORDER', 'LACE_TRIM', 'BUTTONS', 'OTHER'];

/** 'GARMENT', 'FABRIC' or null (a shop that sells both and has not said yet). */
export function whatOf(selling, fabrics) {
  if (!fabrics?.fabricsOn) return 'GARMENT';
  if (fabrics.sells === 'FABRICS') return 'FABRIC';
  if (selling?.what) return selling.what;
  // A product being edited, saved before this question existed: fabric if it has a kind or is not sold by the piece.
  if (selling?.kind || (selling?.soldBy ?? 'PIECE') !== 'PIECE') return 'FABRIC';
  // Fabrics on and not a fabric-only shop (both, or a shop that turned fabrics on before "what you sell" existed):
  // not answered yet, so the pop-up asks.
  return null;
}

/** Whether this shop is asked "garment or fabric": fabrics on, and not a fabric-only shop. */
export const asksWhat = (fabrics) => Boolean(fabrics?.fabricsOn) && fabrics.sells !== 'FABRICS';

/** A fabric-only shop starts every new product as fabric by the metre. Used by both steps (a draft may reopen on 2). */
export function useFabricDefault(selling, onChange) {
  const { data: fabrics } = useFabrics();
  useEffect(() => {
    if (!fabrics?.fabricsOn || fabrics.sells !== 'FABRICS' || selling.kind || (selling.soldBy ?? 'PIECE') !== 'PIECE') return;
    if (fabrics.kinds?.some(k => k.key === 'FABRIC')) {
      onChange({ ...selling, what: 'FABRIC', kind: 'FABRIC', soldBy: 'METRE', rollSize: selling.rollSize ?? fabrics.fabricRollSize });
    }
  }, [fabrics?.fabricsOn, fabrics?.sells]); // eslint-disable-line react-hooks/exhaustive-deps
  return fabrics;
}

const CHOICES = [
  ['GARMENT', 'A garment or ready piece', 'Sold by the piece: sarees, kurtas, lehengas, blouses, dupattas'],
  ['FABRIC', 'Fabric or material', 'Sold by the metre or the packet: cloth, lining, borders, lace, buttons']
];
const LABEL = { GARMENT: 'A garment or ready piece', FABRIC: 'Fabric or material' };

const row = (on, first) => ({
  display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '14px 16px', cursor: 'pointer',
  border: 0, borderTop: first ? 0 : '1px solid var(--border-light)', color: 'var(--text-primary)',
  background: on ? 'color-mix(in srgb, var(--brand) 14%, transparent)' : 'transparent',
  boxShadow: on ? 'inset 3px 0 0 var(--brand-solid)' : 'none'
});
const dot = (on) => ({
  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
  border: `1.5px solid ${on ? 'var(--brand-solid)' : 'var(--text-muted)'}`,
  boxShadow: on ? 'inset 0 0 0 3px var(--bg-card), inset 0 0 0 9px var(--brand-solid)' : 'none'
});
const chip = (on) => ({
  border: `1px solid ${on ? 'var(--brand-solid)' : 'var(--border-light)'}`,
  background: on ? 'color-mix(in srgb, var(--brand) 16%, transparent)' : 'transparent',
  color: 'var(--text-primary)', borderRadius: 999, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
  fontWeight: on ? 700 : 500, textAlign: 'center', minHeight: 36, whiteSpace: 'nowrap'
});

/** The pop-up: two rows, then Continue. Closing it without an answer leaves Add product (onCancel). */
function AskWhat({ current, onPick, onCancel }) {
  const titleId = useId();
  const [pick, setPick] = useState(current);
  // Focus starts on the first choice, not on the close button.
  const ref = useDialog(true, { onClose: onCancel, initialFocus: '[role="radio"]' });
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} data-what-dialog=""
        style={{ background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: 460, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ padding: '18px 20px 6px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 id={titleId} style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>What are you adding?</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>The form then asks only what fits it.</p>
          </div>
          <button type="button" className="btn-icon" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <div role="radiogroup" aria-labelledby={titleId} style={{ border: '1px solid var(--border-light)', borderRadius: 10, overflow: 'hidden' }}>
            {CHOICES.map(([key, title, line], i) => (
              <button key={key} type="button" role="radio" aria-checked={pick === key} style={row(pick === key, i === 0)}
                onClick={() => setPick(key)} onDoubleClick={() => onPick(key)}>
                <span aria-hidden="true" style={dot(pick === key)} />
                <span><strong style={{ display: 'block', fontSize: 14 }}>{title}</strong><span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{line}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '6px 20px 18px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!pick} onClick={() => onPick(pick)}>Continue</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * On step 1: the pop-up while a new product in a shop that sells both has no answer yet; then the answer with Change,
 * and for fabric the kinds. `isNew`: a product being added (an edit never pops up; it already is what it is).
 */
export default function WhatAreYouAdding({ selling, onChange, isNew, onCancel, part = 'all' }) {
  const fabrics = useFabricDefault(selling, onChange);
  const [allKinds, setAllKinds] = useState(false);
  const [asking, setAsking] = useState(false);
  if (!fabrics?.fabricsOn) return null;
  const what = whatOf(selling, fabrics);
  const both = asksWhat(fabrics);

  const choose = (w) => {
    setAsking(false);
    if (w === what) return;
    if (w === 'GARMENT') onChange({ ...selling, what: 'GARMENT', kind: null, soldBy: 'PIECE', minCut: null, rollSize: null, widthCm: null, cutReturnable: false, sellInShop: true });
    else onChange({ ...selling, what: 'FABRIC', kind: 'FABRIC', soldBy: 'METRE', rollSize: selling.rollSize ?? fabrics.fabricRollSize });
  };

  // The unit follows the kind (fabric and lace by the metre, buttons by the packet), unless this shop does not offer it.
  const pickKind = (k) => {
    if (selling.kind === k.key) return;
    const offered = (fabrics.units ?? []).map(u => u.code);
    const soldBy = offered.includes(k.soldBy) ? k.soldBy : 'PIECE';
    onChange({ ...selling, what: 'FABRIC', kind: k.key, soldBy, ...(soldBy === 'METRE' ? { rollSize: selling.rollSize ?? fabrics.fabricRollSize } : { minCut: null, rollSize: null, widthCm: null, cutReturnable: false }) });
  };
  const kinds = (fabrics.kinds ?? []).filter(k => allKinds || COMMON_KINDS.includes(k.key) || selling.kind === k.key);
  const popUp = both && (asking || (isNew && what === null));

  const top = part === 'all' || part === 'top';
  const kindsPart = part === 'all' || part === 'kinds';
  return (
    <>
      {top && popUp && <AskWhat current={what} onPick={choose} onCancel={() => (what ? setAsking(false) : onCancel?.())} />}
      {top && both && what && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: '1px solid var(--border-light)', borderRadius: 10, background: 'var(--bg-input)' }}>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-secondary)' }}>Adding: </span><strong>{LABEL[what]}</strong></span>
          <button type="button" className="btn-secondary" style={{ padding: '6px 12px', minHeight: 34 }} onClick={() => setAsking(true)}>Change</button>
        </div>
      )}
      {kindsPart && what === 'FABRIC' && (
        <div>
          <span className="input-label" id="fabric-kind">Kind</span>
          <div role="radiogroup" aria-labelledby="fabric-kind" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kinds.map(k => (
              <button key={k.key} type="button" role="radio" aria-checked={selling.kind === k.key} style={chip(selling.kind === k.key)} onClick={() => pickKind(k)}>{k.label}</button>
            ))}
            {(fabrics.kinds ?? []).length > COMMON_KINDS.length && (
              <button type="button" onClick={() => setAllKinds(v => !v)} aria-expanded={allKinds}
                style={{ ...chip(false), borderStyle: 'dashed', fontWeight: 600 }}>
                {allKinds ? 'Fewer kinds' : `More kinds (${fabrics.kinds.length - COMMON_KINDS.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
