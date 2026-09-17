import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useSpotTree, useSpotLabels, kindLabel } from '../../hooks/useShelves';

/**
 * Shelf labels to print and stick on: a QR code a scanner reads (it holds the label's permanent code,
 * so it keeps working after a shelf is renamed), the address large enough to read from a step back,
 * and the name.
 *
 *   A4 sheet   24 labels a page (3 × 8, 70 × 37 mm), for an ordinary printer and sticker paper
 *   Thermal    one 50 × 25 mm label a page, for a label printer
 */
const SIZES = {
  a4: { name: 'A4 sticker sheet (3 × 8)', page: 'A4', cols: 3, w: '70mm', h: '37mm', qr: 96, addr: 20 },
  thermal: { name: 'Label printer (50 × 25 mm)', page: '50mm 25mm', cols: 1, w: '50mm', h: '25mm', qr: 76, addr: 13 }
};

export default function ShelfLabels() {
  const [params] = useSearchParams();
  const locationId = params.get('locationId');
  const branch = params.get('branch');
  const [size, setSize] = useState('a4');
  const [endsOnly, setEndsOnly] = useState(true);
  const tree = useSpotTree(locationId);
  const labels = useSpotLabels(locationId);

  const { wanted, ends } = useMemo(() => {
    const ids = new Set();
    const leaves = new Set();
    const walk = (nodes, inside) => {
      for (const n of nodes ?? []) {
        const within = inside || !branch || n.id === branch;
        if (within) ids.add(n.id);
        if (!n.children?.length) leaves.add(n.id);
        walk(n.children, within);
      }
    };
    walk(tree.data?.spots, false);
    return { wanted: ids, ends: leaves };
  }, [tree.data, branch]);

  const rows = (labels.data ?? []).filter(l => wanted.has(l.id) && (!endsOnly || ends.has(l.id)));
  const s = SIZES[size];

  if (!locationId) return <div style={{ padding: 32 }}>Open this from Racks & shelves.</div>;

  return (
    <div className="lbl-root">
      <style>{`
        .lbl-root { background: var(--bg-dark); min-height: 100vh; color: var(--text-primary); }
        .lbl-bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 16px; background: var(--bg-card); border-bottom: 1px solid var(--border-light); }
        .lbl-sheet { display: grid; grid-template-columns: repeat(${s.cols}, ${s.w}); gap: 0; justify-content: center; padding: 16px; }
        .lbl { width: ${s.w}; height: ${s.h}; box-sizing: border-box; padding: ${size === 'a4' ? '3mm 3mm' : '1.5mm 2mm'}; display: flex; align-items: center; gap: ${size === 'a4' ? '3mm' : '2mm'}; background: #fff; color: #000; border: 1px dashed #ccc; overflow: hidden; break-inside: avoid; }
        .lbl-text { min-width: 0; display: grid; gap: 1mm; }
        .lbl-addr { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; font-size: ${s.addr}px; line-height: 1.05; word-break: break-all; }
        .lbl-name { font-size: ${size === 'a4' ? 11 : 8}px; line-height: 1.15; max-height: 2.4em; overflow: hidden; }
        .lbl-meta { font-size: ${size === 'a4' ? 9 : 7}px; color: #444; }
        .lbl-colour { width: 3mm; align-self: stretch; border-radius: 1mm; flex-shrink: 0; }
        @media print {
          @page { size: ${s.page}; margin: ${size === 'a4' ? '10mm 0 0 0' : '0'}; }
          body, .lbl-root { background: #fff !important; }
          .lbl-bar { display: none !important; }
          .lbl-sheet { padding: 0; }
          .lbl { border: none; ${size === 'thermal' ? 'page-break-after: always;' : ''} }
        }
      `}</style>
      <div className="lbl-bar">
        <Link to="/shelves/setup" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={15} /> Back</Link>
        <strong>{rows.length} {rows.length === 1 ? 'label' : 'labels'}</strong>
        <select className="input-field" value={size} onChange={(e) => setSize(e.target.value)} aria-label="Label size" style={{ width: 'auto', minWidth: 220 }}>
          {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={endsOnly} onChange={(e) => setEndsOnly(e.target.checked)} /> Only shelves that hold stock
        </label>
        <button type="button" className="btn-primary" onClick={() => window.print()} disabled={rows.length === 0} style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}><Printer size={16} /> Print</button>
      </div>
      {(tree.isLoading || labels.isLoading) ? (
        <div style={{ padding: 32, display: 'flex', gap: 8 }}><Loader2 className="animate-spin" size={18} /> Preparing labels…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 32 }}>No labels to print here.</div>
      ) : (
        <div className="lbl-sheet">
          {rows.map(l => (
            <div key={l.id} className="lbl">
              {l.colour && <span className="lbl-colour" style={{ background: l.colour }} />}
              <QRCodeSVG value={l.qr} size={s.qr} level="M" marginSize={0} />
              <div className="lbl-text">
                <div className="lbl-addr">{l.address}</div>
                {l.name && <div className="lbl-name">{l.name}</div>}
                <div className="lbl-meta">{kindLabel(l.kind)} · {l.location}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
