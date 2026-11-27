import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Platform Console → a client → What they sell (27 Nov 2026).
 *
 * Ready-made garments, fabrics, or both: ScaleEzy's to set (the owner sees it in Settings and cannot change it; they
 * contact ScaleEzy). Both and Fabrics switch everything sold by the metre on; Ready-made switches it off -- refused in
 * words while a boutique is linked or anything is still sold by the metre or packet. Only for a client with Inventory.
 */
const OPTIONS = [
  { value: 'READY_MADE', label: 'Ready-made only', hint: 'Sarees, blouses, kurtis by the piece' },
  { value: 'FABRICS', label: 'Fabrics only', hint: 'Cloth by the metre, buttons by the packet' },
  { value: 'BOTH', label: 'Both', hint: 'Garments and fabric side by side' }
];

export default function ClientSells({ clientId }) {
  const qc = useQueryClient();
  const key = ['admin', 'clients', clientId, 'sells'];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/admin/clients/${clientId}/sells`)).data, enabled: !!clientId, retry: false });
  const [pick, setPick] = useState(null);
  useEffect(() => { if (q.data) setPick(q.data.sells ?? null); }, [q.data]);
  const save = useMutation({
    mutationFn: async (sells) => (await api.put(`/admin/clients/${clientId}/sells`, { sells })).data,
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      qc.invalidateQueries({ queryKey: ['admin', 'clients', clientId] });
      toast.success(`Saved: ${OPTIONS.find(o => o.value === d.sells)?.label ?? 'updated'}`, { id: `sells-${clientId}` });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'That could not be changed just now. Please try again.', { id: `sells-${clientId}` })
  });

  if (q.isLoading) return null;
  if (q.isError || q.data?.inventoryOn === false) return null;   // not ours, or a client without Inventory: nothing to set
  const now = q.data?.sells ?? null;
  const changed = pick && pick !== now;

  return (
    <div className="card" style={{ padding: '24px', marginTop: '24px' }} data-testid="client-sells">
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>What they sell</h3>
      <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Set by ScaleEzy. The owner sees it in Settings and cannot change it. Fabrics or Both switches on everything sold by the metre.
      </p>
      {!now && (
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--accent-warning, #b7791f)' }}>
          Not set yet.{q.data?.suggested ? ` From their products: ${OPTIONS.find(o => o.value === q.data.suggested)?.label}.` : ''}
        </p>
      )}
      <div role="radiogroup" aria-label="What they sell" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
        {OPTIONS.map(o => {
          const on = pick === o.value;
          const blocked = q.data?.boutiqueLinked && o.value === 'READY_MADE';
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={blocked || save.isPending} onClick={() => setPick(o.value)}
              title={blocked ? 'The Boutique module adds fabrics and materials, so this shop sells both.' : undefined}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: blocked ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: blocked ? 0.55 : 1,
                background: on ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${on ? 'var(--accent-gold)' : 'var(--border-light)'}` }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '13px' }}>{o.label}{now === o.value ? ' (now)' : ''}</span>
              <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)' }}>{blocked ? 'Not with the Boutique module on' : o.hint}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '14px' }}>
        <button type="button" className="btn-primary" disabled={!changed || save.isPending} onClick={() => save.mutate(pick)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Save
        </button>
        {changed && !save.isPending && (
          <button type="button" className="btn-secondary" onClick={() => setPick(now)}>Cancel</button>
        )}
      </div>
    </div>
  );
}
