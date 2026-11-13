import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFabrics, useSetFabrics } from '../../hooks/useFabrics';
import { useShopSetup, useSaveSetup, SELLS_OPTIONS } from '../../hooks/useShopSetup';
import { useAuth } from '../../context/AuthContext';
import { holdsEverything } from '../../lib/authority';
import { fromBase, toBase } from '../../lib/units';

/**
 * Settings → What you sell (13 Nov 2026; PLAN-onboarding-setup.md, PLAN-fabrics.md).
 *
 * What the shop sells -- ready-made, fabrics or both -- is the owner's choice (also asked at first sign-in) and switches
 * everything by the metre on or off; going back to ready-made is refused, in words, while fabric is still on sale.
 * Below it, for a shop that sells fabric: the shortest length sold, the usual roll, and the online shop's quick lengths
 * (typed in metres, kept in centimetres).
 */
const CUTS = [10, 25, 50, 100];
const m = (cm) => String(fromBase(cm, 'METRE'));

const chip = (on) => ({
  border: `1px solid ${on ? 'var(--brand-solid, #A6D92B)' : 'var(--border-light, #e5e7eb)'}`,
  background: on ? 'rgba(166, 217, 43, 0.16)' : 'transparent', color: 'var(--text-primary)',
  borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: on ? 700 : 500
});

export default function FabricsPanel() {
  const { user } = useAuth();
  const isOwner = !!user && holdsEverything(user);
  const { data, isLoading } = useFabrics();
  const { data: setup } = useShopSetup();
  const save = useSetFabrics();
  const saveSells = useSaveSetup();
  const [roll, setRoll] = useState('');
  const [quick, setQuick] = useState('');
  useEffect(() => {
    if (!data) return;
    setRoll(m(data.fabricRollSize));
    setQuick(data.fabricQuickLengths.map(m).join(', '));
  }, [data]);

  if (isLoading || !data) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  const failed = (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'That could not be saved. Try again.');
  const send = (patch, done) => save.mutate(patch, { onSuccess: () => toast.success(done), onError: failed });
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
  // What the shop sells. A shop never asked is shown its best guess, not chosen until the owner picks.
  const sells = data.sells ?? null;
  const pick = (v) => {
    if (!isOwner || v === sells || saveSells.isPending) return;
    saveSells.mutate({ sells: v }, { onSuccess: () => toast.success(`Updated: ${SELLS_OPTIONS.find(o => o.value === v)?.title}`), onError: failed });
  };

  const row = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border-light, #e5e7eb)', flexWrap: 'wrap' };
  return (
    <div style={{ display: 'grid' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>What you sell</h2>
      <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: 13 }}>
        Your selection determines how products are added and displayed. With ready-made garments only, length-based
        options remain hidden; fabrics are sold by the metre and accessories by the packet.
      </p>

      <div role="radiogroup" aria-label="What you sell" style={{ border: '1px solid var(--border-light, #e5e7eb)', borderRadius: 10, overflow: 'hidden', maxWidth: 720 }}>
        {SELLS_OPTIONS.map((o, i) => {
          const on = sells === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={!isOwner || saveSells.isPending} onClick={() => pick(o.value)}
              style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left', padding: '14px 16px', border: 0, borderTop: i ? '1px solid var(--border-light, #e5e7eb)' : 0, cursor: isOwner ? 'pointer' : 'default', color: 'var(--text-primary)',
                background: on ? 'rgba(166, 217, 43, 0.1)' : 'transparent', boxShadow: on ? 'inset 3px 0 0 #164B1E' : 'none', opacity: !isOwner && !on ? 0.6 : 1 }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `1.5px solid ${on ? '#164B1E' : 'var(--text-muted)'}`, boxShadow: on ? 'inset 0 0 0 3px var(--bg-card), inset 0 0 0 9px #164B1E' : 'none' }} />
              <span style={{ display: 'grid', gap: 2 }}><strong style={{ fontSize: 14 }}>{o.title}</strong><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{o.line}</span></span>
            </button>
          );
        })}
      </div>
      {!sells && setup?.suggested && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Not selected yet. Based on your existing catalogue, the suggested option is <strong>{SELLS_OPTIONS.find(o => o.value === setup.suggested)?.title}</strong>.</p>
      )}
      {!isOwner && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Only the account owner can change this setting.</p>}

      {data.fabricsOn && (
        <div id="fabric-options">
          <div style={row}>
            <div>
              <strong>Minimum cut length</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12.5, maxWidth: 560 }}>
                All fabric sales are made in multiples of this length. It can be set individually for each fabric.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CUTS.map(c => (
                <button key={c} type="button" style={chip(data.fabricMinCut === c)} aria-pressed={data.fabricMinCut === c}
                  onClick={() => data.fabricMinCut !== c && send({ fabricMinCut: c }, `Minimum cut length: ${m(c)} m`)}>{m(c)} m</button>
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
              <input className="input-field" aria-label="Quick lengths in metres, separated by commas" value={quick} onChange={e => setQuick(e.target.value)} onBlur={saveQuick} style={{ width: 160 }} />
              <span style={{ color: 'var(--text-muted)' }}>m</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
