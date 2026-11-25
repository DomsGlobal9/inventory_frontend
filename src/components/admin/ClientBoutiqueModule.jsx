import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Scissors, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

/**
 * Platform Console → client → Boutique module (PLAN-boutique-sync.md). Only ScaleEzy turns the boutique on or off for
 * a client: type the boutique account, see what enabling will do, Enable. An account that has been running as its
 * own boutique-only shop brings its items, stock and history into this client's shop.
 */
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const VALID = /^[a-z0-9][a-z0-9_-]{1,62}$/;
const handedText = (h) => !h ? '' : `: ${h.itemsCoded} item${h.itemsCoded === 1 ? '' : 's'} handed over${h.skipped?.length ? `, ${h.skipped.length} need a new code (${h.skipped.slice(0, 3).join(', ')})` : ''}`;
const WHO_RUNS = [
  { value: false, label: 'Shared with the shop', hint: 'The boutique keeps its own items here. The shop\'s products stay the shop\'s.' },
  { value: true, label: 'The boutique app runs the whole shop', hint: 'Every product here becomes the boutique\'s, by its SKU, priced in the boutique app.' }
];

export default function ClientBoutiqueModule({ clientId }) {
  const qc = useQueryClient();
  const key = ['admin', 'clients', clientId, 'boutique'];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/admin/clients/${clientId}/boutique`)).data, enabled: !!clientId });
  const [tenant, setTenant] = useState('');
  const [checked, setChecked] = useState(null);
  const [confirm, setConfirm] = useState(false);
  // 24 Nov (Swathy Reddy): the boutique app may run the WHOLE shop, every product included, not only its own items.
  const [handOver, setHandOver] = useState(false);
  const [confirmHandOver, setConfirmHandOver] = useState(false);
  // A double-click sends one request: the button's disabled state only lands after the first click has re-rendered.
  const sending = useRef(false);
  const typed = tenant.trim().toLowerCase();

  // What enabling would do, looked up as the account is typed (after a short pause).
  useEffect(() => {
    setChecked(null);
    if (!VALID.test(typed)) return undefined;
    const t = setTimeout(async () => {
      try { setChecked({ for: typed, ...(await api.get(`/admin/boutique-accounts/${encodeURIComponent(typed)}`)).data }); } catch { setChecked(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [typed]);

  const fail = (e) => toast.error(e?.response?.data?.message ?? 'The Boutique module could not be changed just now. Please try again.');
  const enable = useMutation({
    mutationFn: async () => (await api.put(`/admin/clients/${clientId}/boutique`, { tenant: typed, handOver })).data,
    onSuccess: (d) => { toast.success(`Boutique module enabled${handedText(d?.handedOver)}`); setTenant(''); setHandOver(false); qc.invalidateQueries({ queryKey: key }); },
    onError: fail
  });
  const handOverNow = useMutation({
    mutationFn: async () => (await api.post(`/admin/clients/${clientId}/boutique/hand-over`)).data,
    onSuccess: (d) => { toast.success(`The boutique app now runs this shop${handedText(d)}`); qc.invalidateQueries({ queryKey: key }); },
    onError: fail
  });
  const disable = useMutation({
    mutationFn: async () => (await api.delete(`/admin/clients/${clientId}/boutique`)).data,
    onSuccess: () => { toast.success('Boutique module disabled'); qc.invalidateQueries({ queryKey: key }); },
    onError: fail
  });

  const ready = checked && checked.for === typed;
  const blocked = ready && checked.state === 'taken';
  const note = !typed ? null
    : !VALID.test(typed) ? 'Letters, numbers and hyphens, like lakshmi-boutique.'
    : !ready ? 'Checking the account…'
    : checked.state === 'new' ? 'A new boutique account. Enabling connects it to this client.'
    : checked.state === 'free' ? 'This account was disconnected earlier. Enabling connects it to this client.'
    : checked.state === 'boutique-only' ? `This boutique already runs on its own with ${checked.items} item${checked.items === 1 ? '' : 's'}. Enabling moves its items, stock and history into this client's shop.`
    : 'This account is used by another client. Disable it there first.';

  const box = { border: '1px solid var(--border-light)', borderRadius: '16px', marginTop: '24px', overflow: 'hidden', background: 'var(--bg-card)' };
  return (
    <div style={box} data-testid="boutique-module">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><Scissors size={17} /> Boutique module</strong>
        <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          The client's ScaleEzy Boutique (stitching, tailors) keeps its items and stock in this shop: one stock for the shop,
          the online store and the boutique. Boutique prices are set in the boutique.
        </p>
      </div>
      <div style={{ padding: '18px 20px' }}>
        {isLoading || !data ? <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          : data.linked ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13.5px' }}>
                <strong>Enabled</strong>: <code>{data.tenant}</code>{data.shopName ? ` (${data.shopName})` : ''}
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Since {when(data.linkedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={() => setConfirmHandOver(true)} disabled={handOverNow.isPending}>Boutique app runs the whole shop</button>
                <button type="button" className="btn-secondary" onClick={() => setConfirm(true)} disabled={disable.isPending}>Disable</button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!ready || blocked || sending.current) return; sending.current = true; enable.mutate(undefined, { onSettled: () => { sending.current = false; } }); }} style={{ display: 'grid', gap: '8px', maxWidth: '560px' }}>
              <label htmlFor="boutique-account" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Boutique account</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input id="boutique-account" className="input-field" value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="lakshmi-boutique"
                  autoCapitalize="none" spellCheck={false} style={{ flex: '1 1 240px' }} />
                <button type="submit" className="btn-primary" disabled={!ready || blocked || enable.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {enable.isPending && <Loader2 size={15} className="animate-spin" />} Enable
                </button>
              </div>
              {note && <div role="status" style={{ fontSize: '12.5px', color: blocked ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>{note}</div>}
              <div role="radiogroup" aria-label="Who runs the shop's products" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginTop: '4px' }}>
                {WHO_RUNS.map(o => {
                  const on = handOver === o.value;
                  return (
                    <button key={String(o.value)} type="button" role="radio" aria-checked={on} onClick={() => setHandOver(o.value)}
                      style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-primary)', background: on ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${on ? 'var(--accent-gold)' : 'var(--border-light)'}` }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: '13px' }}>{o.label}</span>
                      <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)' }}>{o.hint}</span>
                    </button>
                  );
                })}
              </div>
              {!typed && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Not enabled. The client's shop shows nothing about the boutique until it is.</div>}
            </form>
          )}
      </div>
      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => { await disable.mutateAsync(); }}
        title="Disable the Boutique module?"
        message="The boutique will no longer reach this client's products and stock. Everything it added stays in the shop, and the shop can then change those items' prices. It can be enabled again at any time."
        confirmText="Disable"
        confirmStyle="danger"
      />
      <ConfirmModal
        isOpen={confirmHandOver}
        onClose={() => setConfirmHandOver(false)}
        onConfirm={async () => { await handOverNow.mutateAsync(); }}
        title="Let the boutique app run the whole shop?"
        message="Every product in this shop becomes the boutique's: the boutique app lists it by its SKU and sets its price; the shop can no longer change those prices. Stock, orders, customers and history stay as they are."
        confirmText="Hand over"
      />
    </div>
  );
}
