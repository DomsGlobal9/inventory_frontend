import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useLogistics } from './PackOrders';

/**
 * Settings → Packing → Box sizes (28 Oct). The boxes staff choose from when packing for ScaleEzy
 * Logistics; their size goes to the courier with the real weight. Shown only for a shop on Logistics.
 */
export default function BoxSizesPanel() {
  const logistics = useLogistics(true);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [said, setSaid] = useState(null);

  useEffect(() => { if (logistics.data?.boxes && rows === null) setRows(logistics.data.boxes.map(b => ({ ...b }))); }, [logistics.data, rows]);
  if (!logistics.data?.on || !rows) return null;

  const set = (i, k, v) => setRows(r => r.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const save = async () => {
    setSaving(true); setSaid(null);
    try {
      const boxes = rows.map(b => ({ name: b.name, lengthCm: Number(b.lengthCm), breadthCm: Number(b.breadthCm), heightCm: Number(b.heightCm) }));
      const saved = (await api.put('/logistics/boxes', { boxes })).data;
      setRows(saved.map(b => ({ ...b })));
      queryClient.invalidateQueries({ queryKey: ['logistics'] });
      toast.success('Box sizes saved.');
    } catch (err) {
      setSaid(err?.message || 'Those box sizes could not be saved.');
    } finally { setSaving(false); }
  };
  const cell = { width: '100%', minWidth: 0 };

  return (
    <section style={{ display: 'grid', gap: 12 }} aria-label="Box sizes">
      <div>
        <h3 style={{ fontSize: 18, margin: 0 }}>Box sizes</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>The boxes you pack parcels in, in cm. Staff pick one and weigh the parcel; ScaleEzy Logistics chooses the courier and sends the label.</p>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) repeat(3, minmax(0,1fr)) 36px', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Name</span><span>Length</span><span>Breadth</span><span>Height</span><span />
        </div>
        {rows.map((b, i) => (
          <div key={b.id ?? `new-${i}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) repeat(3, minmax(0,1fr)) 36px', gap: 6 }}>
            <input className="input-field" style={cell} value={b.name} maxLength={30} onChange={e => set(i, 'name', e.target.value)} aria-label={`Box ${i + 1} name`} />
            {['lengthCm', 'breadthCm', 'heightCm'].map(k => (
              <input key={k} className="input-field" style={cell} inputMode="decimal" value={b[k] ?? ''} onChange={e => set(i, k, e.target.value)} aria-label={`Box ${i + 1} ${k.replace('Cm', '')} in cm`} />
            ))}
            <button type="button" className="btn-secondary" aria-label={`Remove ${b.name || `box ${i + 1}`}`} disabled={rows.length <= 1}
              onClick={() => setRows(r => r.filter((_, j) => j !== i))} style={{ padding: 0, display: 'grid', placeItems: 'center' }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      {said && <span role="alert" style={{ color: 'var(--accent-danger)', fontSize: 13 }}>{said}</span>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" disabled={rows.length >= 8} onClick={() => setRows(r => [...r, { name: '', lengthCm: '', breadthCm: '', heightCm: '' }])}
          style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Plus size={15} /> Add a box</button>
        <button type="button" className="btn-primary" disabled={saving} onClick={save} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {saving && <Loader2 size={15} className="animate-spin" />} Save box sizes
        </button>
      </div>
    </section>
  );
}
