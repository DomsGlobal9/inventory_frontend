import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

/**
 * Platform Console → client → Modules and Connections (26 Nov 2026, one-switch onboarding; the owner approved the
 * mockup in CRM's plan). One switch per module the client may have; every module it has connects to the others by
 * itself, and the checklist below shows, in each module's own words, how far each has got. Replaces the separate
 * Boutique and Till (POS) boxes. The owner gets an email about every change.
 */
const MODULE_TEXT = {
  inventory: { hint: 'Products, stock, orders, online shop', on: 'The owner can use Inventory\'s screens: products, stock, orders and the online shop. POS and CRM are told at once and connect to it.', off: 'Inventory\'s screens close for this shop, the till\'s link to Inventory closes and Logistics goes off with it. Nothing is deleted; switching it on again brings everything back.' },
  pos: { hint: 'Billing at the counter', on: 'POS makes (or joins) the shop\'s POS, connects it to the shop\'s other modules, and emails the owner a link to set their POS password.', off: 'Every till of this shop closes at once and none can open. Bills, staff and settings are kept, and POS opens as it was when switched on again.' },
  crm: { hint: 'Customers, follow-ups, offers', on: 'CRM switches the shop on and, when Inventory is on, copies its past customers. The owner signs in to CRM with the same ScaleEzy email and password.', off: 'CRM pauses for this shop: no customer messages in or out. Customers stay in CRM and are back as they were when it is switched on again.' },
  boutique: { hint: 'The Boutique app runs on ScaleEzy', on: '', off: 'The Boutique app account is unlinked from this shop. Its items stay here; the Boutique app can no longer change them.' },
  logistics: { hint: 'Couriers for online orders', on: 'Packing an order books the courier through ScaleEzy Logistics, and tracking shows on the order.', off: 'Parcels stop going to Logistics. It is refused while parcels are still with Logistics.' }
};
const DOT = { ok: 'var(--accent-success, #2f7d3b)', warn: 'var(--accent-warning, #b7791f)', bad: 'var(--accent-danger, #b42318)' };
const STATE_WORD = { ok: 'Done', warn: 'Needs a look', bad: 'Not working' };
const WHO_RUNS = [
  { value: false, label: 'Shared with the shop', hint: 'The boutique keeps its own items here. The shop\'s products stay the shop\'s.' },
  { value: true, label: 'The boutique app runs the whole shop', hint: 'Every product here becomes the boutique\'s, by its SKU, priced in the boutique app.' }
];

function Switch({ on, label, disabled, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick}
      style={{ width: 40, height: 22, borderRadius: 999, border: 'none', padding: 0, position: 'relative', cursor: disabled ? 'default' : 'pointer', flex: 'none',
        background: on ? 'var(--accent-gold)' : 'var(--border-light)', opacity: disabled ? 0.6 : 1, transition: 'background 150ms ease-out' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 150ms ease-out', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </button>
  );
}

export default function ClientModules({ clientId }) {
  const qc = useQueryClient();
  const mKey = ['admin', 'clients', clientId, 'modules'];
  const cKey = ['admin', 'clients', clientId, 'connections'];
  const modules = useQuery({ queryKey: mKey, queryFn: async () => (await api.get(`/admin/clients/${clientId}/modules`)).data, enabled: !!clientId });
  const connections = useQuery({
    queryKey: cKey, queryFn: async () => (await api.get(`/admin/clients/${clientId}/connections`)).data, enabled: !!clientId, retry: false,
    // While a module is still being told, look again every 5 seconds; otherwise every minute.
    refetchInterval: (q) => (q.state.data?.groups ?? []).some(g => g.lines.some(l => /-told$/.test(l.key))) ? 5000 : 60000
  });
  const [ask, setAsk] = useState(null); // { module, on }
  const [tenant, setTenant] = useState('');
  const [handOver, setHandOver] = useState(false);
  const [confirmHandOver, setConfirmHandOver] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [ownerLink, setOwnerLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = () => { qc.invalidateQueries({ queryKey: mKey }); qc.invalidateQueries({ queryKey: cKey }); qc.invalidateQueries({ queryKey: ['admin', 'clients', clientId] }); };
  const fail = (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'That could not be changed just now. Please try again.');
  const set = useMutation({
    mutationFn: async ({ module, on }) => (await api.put(`/admin/clients/${clientId}/modules`, { modules: { [module]: on }, ...(module === 'boutique' && on ? { boutique: { tenant: tenant.trim().toLowerCase(), handOver } } : {}) })).data,
    onSuccess: (d, v) => { toast.success(`${labelOf(v.module)} is ${v.on ? 'on' : 'off'} for this client. The owner gets an email.`); setAsk(null); setTenant(''); setHandOver(false); refresh(); },
    onError: fail
  });
  const retry = useMutation({ mutationFn: async (module) => (await api.post(`/admin/clients/${clientId}/modules/${module}/retry`)).data, onSuccess: () => { toast.success('Asked again.'); setTimeout(refresh, 1500); }, onError: fail });
  const posLink = useMutation({ mutationFn: async (reset) => (await api.post(`/admin/clients/${clientId}/pos/owner-link`, reset ? { reset: true } : {})).data, onSuccess: (d) => { setOwnerLink(d?.ownerLink ?? null); toast.success(d?.ownerLink ? 'A new welcome link is ready' : 'Done'); }, onError: fail });
  const hand = useMutation({ mutationFn: async () => (await api.post(`/admin/clients/${clientId}/boutique/hand-over`)).data, onSuccess: () => { toast.success('The boutique app now runs the whole shop.'); refresh(); }, onError: fail });

  const all = modules.data?.all ?? [];
  const labelOf = (m) => all.find(x => x.module === m)?.label ?? m;
  const onNow = (m) => all.find(x => x.module === m)?.on === true;
  const box = { border: '1px solid var(--border-light)', borderRadius: '16px', marginTop: '24px', overflow: 'hidden', background: 'var(--bg-card)' };
  const groups = connections.data?.groups ?? [];
  const overall = connections.data?.overall;

  return (
    <>
      <section style={box} data-testid="client-modules" aria-labelledby="modules-title">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 id="modules-title" style={{ margin: 0, fontSize: '15px' }}>Modules</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>Switch on what the client bought. Every module they have connects to the others by itself; the owner gets an email about each change.</p>
        </div>
        <div style={{ padding: '14px 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {modules.isLoading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            : modules.isError ? <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>The modules could not be read just now. <button type="button" className="btn-secondary" onClick={() => modules.refetch()}>Try again</button></div>
            : all.map(m => (
              <div key={m.module} data-module={m.module} style={{ border: `1px solid ${m.on ? 'var(--accent-gold)' : 'var(--border-light)'}`, borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 6, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{m.label}</strong>
                  <Switch on={m.on} label={`${m.label} on`} disabled={set.isPending} onClick={() => setAsk({ module: m.module, on: !m.on })} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.on ? 'On' : 'Off'} · {MODULE_TEXT[m.module]?.hint}</span>
                {m.module === 'boutique' && m.on && modules.data?.boutiqueTenant && <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>Account <code>{modules.data.boutiqueTenant}</code></span>}
              </div>
            ))}
        </div>
      </section>

      <section style={box} data-testid="client-connections" aria-labelledby="connections-title">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 id="connections-title" style={{ margin: 0, fontSize: '15px' }}>Connections</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {overall === 'ok' ? 'Everything is connected.' : overall === 'warn' ? 'Mostly connected. The amber lines need a look.' : overall === 'bad' ? 'Something is not working. The red lines say what.' : 'What each module says about this client.'}
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => connections.refetch()} disabled={connections.isFetching} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {connections.isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check again
          </button>
        </div>
        <div style={{ padding: '4px 20px 16px' }}>
          {connections.isLoading ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Checking every module…</div>
            : connections.isError ? <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>The checklist could not be made just now.</div>
            : groups.map(g => (
              <div key={g.module} data-group={g.module} style={{ paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{g.label}</div>
                {g.lines.map((l, i) => (
                  <div key={l.key} data-line={l.key} data-state={l.state} style={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr) auto', gap: 10, alignItems: 'start', padding: '9px 0', borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, background: DOT[l.state] ?? DOT.warn }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.label} <span className="sr-only">({STATE_WORD[l.state]})</span></div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{l.says}</div>
                    </div>
                    {l.action?.retry ? <button type="button" className="btn-secondary" disabled={retry.isPending} onClick={() => retry.mutate(l.action.retry)}>{l.action.label}</button>
                      : l.action?.href ? <a className="btn-secondary" href={l.action.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{l.action.label}</a>
                      : <span />}
                  </div>
                ))}
                {g.module === 'pos' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0 2px' }}>
                    <button type="button" className="btn-secondary" disabled={posLink.isPending} onClick={() => posLink.mutate(false)}>New owner link</button>
                    <button type="button" className="btn-secondary" disabled={posLink.isPending} onClick={() => setConfirmReset(true)}>Owner can't sign in</button>
                  </div>
                )}
                {g.module === 'pos' && ownerLink && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 12.5, minWidth: 0 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Owner's welcome link (works once):</span>
                    <code style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{ownerLink}</code>
                    <button type="button" className="btn-secondary" aria-label="Copy the link" onClick={async () => { try { await navigator.clipboard.writeText(ownerLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error('Select the link and copy it by hand.'); } }}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}</button>
                  </div>
                )}
                {g.module === 'boutique' && onNow('boutique') && (
                  <div style={{ padding: '8px 0 2px' }}><button type="button" className="btn-secondary" disabled={hand.isPending} onClick={() => setConfirmHandOver(true)}>The boutique app runs the whole shop</button></div>
                )}
              </div>
            ))}
        </div>
      </section>

      {/* Switching a module: what will happen, in words, before it does. Boutique on needs the account. */}
      <ConfirmModal isOpen={!!ask && !(ask.module === 'boutique' && ask.on)} onClose={() => setAsk(null)}
        onConfirm={async () => { await set.mutateAsync(ask); }}
        title={ask ? `Switch ${labelOf(ask.module)} ${ask.on ? 'on' : 'off'}?` : ''}
        message={ask ? `${MODULE_TEXT[ask.module]?.[ask.on ? 'on' : 'off'] ?? ''} The owner gets an email about it.` : ''}
        confirmText={ask?.on ? 'Switch on' : 'Switch off'} confirmStyle={ask?.on ? undefined : 'danger'} />
      {ask?.module === 'boutique' && ask.on && (
        <div role="dialog" aria-modal="true" aria-labelledby="btq-on-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 50 }}>
          <form onSubmit={(e) => { e.preventDefault(); set.mutate(ask); }} style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 20, width: 'min(460px, 100%)', display: 'grid', gap: 12 }}>
            <h3 id="btq-on-title" style={{ margin: 0, fontSize: 16 }}>Switch the Boutique module on</h3>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Boutique app account</span>
              <input className="input-field" value={tenant} onChange={e => setTenant(e.target.value)} maxLength={63} placeholder="lakshmi-boutique" autoFocus />
            </label>
            <div role="radiogroup" aria-label="Who runs the shop's products" style={{ display: 'grid', gap: 8 }}>
              {WHO_RUNS.map(o => (
                <button key={String(o.value)} type="button" role="radio" aria-checked={handOver === o.value} onClick={() => setHandOver(o.value)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', color: 'var(--text-primary)', background: handOver === o.value ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${handOver === o.value ? 'var(--accent-gold)' : 'var(--border-light)'}` }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{o.hint}</span>
                </button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>The owner gets an email about it.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setAsk(null)} disabled={set.isPending}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={set.isPending || !tenant.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{set.isPending && <Loader2 size={14} className="animate-spin" />} Switch on</button>
            </div>
          </form>
        </div>
      )}
      <ConfirmModal isOpen={confirmHandOver} onClose={() => setConfirmHandOver(false)} onConfirm={async () => { await hand.mutateAsync(); }}
        title="Let the boutique app run the whole shop?" message="Every product here becomes the boutique's, by its SKU, priced in the boutique app."
        confirmText="Hand it over" />
      <ConfirmModal isOpen={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={async () => { await posLink.mutateAsync(true); }}
        title="Reset the owner's POS password?" message="Their old password stops working, and the new welcome link lets them choose a new one. Any earlier link stops working."
        confirmText="Reset and make link" />
    </>
  );
}
