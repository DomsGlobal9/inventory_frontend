import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFabrics, useSetFabrics } from '../../hooks/useFabrics';
import { fromBase, toBase } from '../../lib/units';

/**
 * Settings → Fabrics (13 Nov 2026, PLAN-fabrics.md; mockup 1). The owner manages it all: the switch, the shortest
 * length sold, the usual roll, and the quick lengths the online shop offers. Lengths are typed in metres and kept
 * in centimetres. Switching off is refused by the server while products are still sold by the metre or packet.
 */
const CUTS = [10, 25, 50, 100];
const m = (cm) => String(fromBase(cm, 'METRE'));

const chip = (on) => ({
  border: `1px solid ${on ? 'var(--brand-solid, #A6D92B)' : 'var(--border-light, #e5e7eb)'}`,
  background: on ? 'rgba(166, 217, 43, 0.16)' : 'transparent', color: 'var(--text-primary)',
  borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: on ? 700 : 500
});

export default function FabricsPanel() {
  const { data, isLoading } = useFabrics();
  const save = useSetFabrics();
  const [roll, setRoll] = useState('');
  const [quick, setQuick] = useState('');
  useEffect(() => {
    if (!data) return;
    setRoll(m(data.fabricRollSize));
    setQuick(data.fabricQuickLengths.map(m).join(', '));
  }, [data]);

  if (isLoading || !data) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  const send = (patch, done) => save.mutate(patch, {
    onSuccess: () => toast.success(done),
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'That could not be saved. Try again.')
  });
  const saveRoll = () => {
    const cm = toBase(roll, 'METRE');
    if (cm === null || cm < 100) { toast.error('A roll is at least 1 m, like 25.'); return; }
    if (cm !== data.fabricRollSize) send({ fabricRollSize: cm }, 'Roll length saved');
  };
  const saveQuick = () => {
    const parts = quick.split(/[,\s]+/).filter(Boolean).map(t => toBase(t, 'METRE'));
    if (!parts.length || parts.some(p => p === null || p < 1)) { toast.error('Give lengths in metres, like 1, 2.5, 5.5.'); return; }
    send({ fabricQuickLengths: parts }, 'Quick lengths saved');
  };

  const row = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-light, #e5e7eb)', flexWrap: 'wrap' };
  return (
    <div style={{ display: 'grid' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Fabrics</h2>
      <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 13 }}>
        Sell cloth, lining, lace and borders by the metre, and buttons or hooks by the packet. Products sold by the piece
        are not changed.
      </p>

      <div style={row}>
        <div>
          <strong>Sell fabric by the metre</strong>
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12.5, maxWidth: 560 }}>
            When on, a product can be sold by the metre or the packet, in ScaleEzy and your online shop. The POS till
            gets them once it can take lengths.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={data.fabricsOn} aria-label="Sell fabric by the metre" disabled={save.isPending}
          onClick={() => send({ fabricsOn: !data.fabricsOn }, data.fabricsOn ? 'Fabrics switched off' : 'Fabrics switched on')}
          style={{ width: 46, height: 26, borderRadius: 999, border: 0, cursor: 'pointer', position: 'relative', background: data.fabricsOn ? 'var(--brand-deep, #164B1E)' : '#d6d9de' }}>
          <span style={{ position: 'absolute', top: 3, left: data.fabricsOn ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: data.fabricsOn ? 'var(--brand-solid, #A6D92B)' : '#fff', transition: 'left 150ms ease-out' }} />
        </button>
      </div>

      <div style={row}>
        <div>
          <strong>Smallest cut</strong>
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12.5, maxWidth: 560 }}>
            The shortest length you sell. Every sale is a multiple of it. Each product can change it.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CUTS.map(c => (
            <button key={c} type="button" style={chip(data.fabricMinCut === c)} aria-pressed={data.fabricMinCut === c}
              onClick={() => data.fabricMinCut !== c && send({ fabricMinCut: c }, `Smallest cut: ${m(c)} m`)}>{m(c)} m</button>
          ))}
        </div>
      </div>

      <div style={row}>
        <div>
          <strong>Usual roll length</strong>
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12.5, maxWidth: 560 }}>Filled in for new fabric bought in rolls.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="input-field" inputMode="decimal" value={roll} onChange={e => setRoll(e.target.value)} onBlur={saveRoll} style={{ width: 90 }} aria-label="Usual roll length in metres" />
          <span style={{ color: 'var(--text-muted)' }}>m per roll</span>
        </label>
      </div>

      <div style={{ ...row, borderBottom: 0 }}>
        <div>
          <strong>Quick lengths in the online shop</strong>
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12.5, maxWidth: 560 }}>
            One-tap lengths under the length picker, in metres. For example 1 m, 2.5 m for a blouse, 5.5 m for a saree.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="input-field" value={quick} onChange={e => setQuick(e.target.value)} onBlur={saveQuick} style={{ width: 160 }} aria-label="Quick lengths in metres, separated by commas" />
          <span style={{ color: 'var(--text-muted)' }}>m</span>
        </label>
      </div>
    </div>
  );
}
