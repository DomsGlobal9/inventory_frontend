import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyRound, Copy, Plus, Monitor } from 'lucide-react';
import { api } from '../../lib/api';
import { useLocationContext } from '../../contexts/LocationContext';
import ConfirmModal from '../ConfirmModal';

/**
 * Settings → Money → POS (billing counter).
 *
 * The owner makes a key here and pastes it into the ScaleEzy POS; from then on bills made at the
 * counter take stock out of the chosen location and appear in the Day Book. This is deliberately
 * NOT "Connected websites": a till is not a website, it has no address to send updates to, and its
 * key must not open the website feed (nor a website's key the till's door) -- the server enforces
 * that split, this screen only ever lists tills.
 *
 * The key is shown ONCE, when made or replaced. After that only its first characters, which is
 * all anybody needs to tell two tills apart.
 */

const KEY = ['pos', 'tills'];

const when = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function PosTills() {
  const qc = useQueryClient();
  const { locations = [] } = useLocationContext();
  const usable = locations.filter(l => l.active !== false);

  const { data: tills = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/pos-connections')).data || []
  });

  const [locationId, setLocationId] = useState('');
  const [name, setName] = useState('');
  const [problem, setProblem] = useState(null);
  /* The one readable copy of a key, until the owner closes it. */
  const [shown, setShown] = useState(null);
  const [confirm, setConfirm] = useState({ isOpen: false });

  // Every 'pos' query: the list here, and which stores bill at a till (it decides whether New sale shows).
  const done = () => qc.invalidateQueries({ queryKey: ['pos'] });
  const say = (e) => e?.response?.data?.message || e?.message || 'That did not work. Try again.';

  const create = useMutation({
    mutationFn: async (body) => (await api.post('/pos-connections', body)).data,
    onSuccess: (d) => { setShown({ key: d.key, name: d.name }); setName(''); setProblem(null); done(); },
    onError: (e) => setProblem(say(e))
  });
  const replace = useMutation({
    mutationFn: async (id) => (await api.post(`/pos-connections/${id}/replace-key`)).data,
    onSuccess: (d) => { setShown({ key: d.key, name: d.name, replaced: true }); done(); },
    onError: (e) => toast.error(say(e))
  });
  const disconnect = useMutation({
    mutationFn: async (id) => (await api.post(`/pos-connections/${id}/disconnect`)).data,
    onSuccess: () => { toast.success('Till disconnected.'); done(); },
    onError: (e) => toast.error(say(e))
  });

  const chosen = locationId || (usable.length === 1 ? usable[0].id : '');

  const submit = (e) => {
    e.preventDefault();
    if (!chosen) { setProblem('Choose the stock location this counter sells from.'); return; }
    create.mutate({ locationId: chosen, name: name.trim() || undefined });
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Key copied.'); }
    catch { toast.error('Could not copy. Select the key and copy it by hand.'); }
  };

  const card = { border: '1px solid var(--border-light)', borderRadius: '12px', padding: '18px', marginBottom: '18px' };

  return (
    <div>
      <h2 style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>POS (billing counter)</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 22px', lineHeight: 1.6, maxWidth: '60ch' }}>
        Connect your ScaleEzy POS till to this Inventory. Bills made at the counter reduce stock here
        and appear in the Day Book.
      </p>

      <form onSubmit={submit} style={card} aria-label="Connect a till">
        <h3 style={{ fontSize: '16px', margin: '0 0 14px' }}>Connect a till</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="input-label" htmlFor="pos-location">Sells from</label>
            <select id="pos-location" className="input-field" value={chosen}
              onChange={(e) => { setLocationId(e.target.value); setProblem(null); }}>
              {usable.length !== 1 ? <option value="">Choose a stock location</option> : null}
              {usable.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="pos-name">Name (optional)</label>
            <input id="pos-name" className="input-field" value={name} maxLength={80} placeholder="Main counter"
              onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={create.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '42px' }}>
            <Plus size={16} /> {create.isPending ? 'Creating…' : 'Create key'}
          </button>
        </div>
        {problem ? <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '13px', margin: '10px 0 0' }}>{problem}</p> : null}
        {usable.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '10px 0 0' }}>
            Add a stock location first (Settings, Stock locations). A till sells from one.
          </p>
        ) : null}
      </form>

      {shown ? (
        <div role="status" style={{ ...card, border: '1.5px solid var(--accent-success, #16a34a)', background: 'var(--bg-success, rgba(22,163,74,.06))' }}>
          <p style={{ fontWeight: 600, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={16} /> {shown.replaced ? 'New key' : 'Your key'} for {shown.name}. It is shown only this once.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <code data-testid="pos-key" style={{ flex: '1 1 260px', minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px 12px', userSelect: 'all' }}>
              {shown.key}
            </code>
            <button type="button" className="btn-secondary" onClick={() => copy(shown.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Copy size={15} /> Copy
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0 0', lineHeight: 1.6 }}>
            In the POS, open More → Settings → Inventory link, paste this key, press Connect, then
            Refresh items from Inventory.
            {shown.replaced ? ' The old key has stopped working.' : ''}
          </p>
          <button type="button" className="btn-secondary" onClick={() => setShown(null)} style={{ marginTop: '12px' }}>
            I have copied it
          </button>
        </div>
      ) : null}

      <h3 style={{ fontSize: '16px', margin: '6px 0 10px' }}>Connected tills</h3>
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading tills…</p>
      ) : tills.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={16} /> No till connected yet. Create a key above and paste it into the POS.
        </p>
      ) : (
        <ul aria-label="Connected tills" style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          {tills.map((t, i) => {
            const last = when(t.lastBillAt);
            return (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 16px', borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {t.name}
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                      background: last ? 'var(--bg-success, rgba(22,163,74,.1))' : 'var(--bg-warning, rgba(217,119,6,.1))',
                      color: last ? 'var(--accent-success, #15803d)' : 'var(--accent-warning, #b45309)' }}>
                      {last ? 'Connected' : 'No bills yet'}
                    </span>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                    {t.locationName} · key sk_{t.keyPrefix}… · made {when(t.createdAt)}
                    {last ? ` · last bill from this location ${last}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" disabled={replace.isPending}
                    onClick={() => setConfirm({
                      isOpen: true, title: `Replace the key for ${t.name}?`, confirmText: 'Replace key',
                      message: 'A new key is made and the old one stops working at once. The till stops sending bills until the new key is pasted in it. Bills it already sent are safe.',
                      onConfirm: () => replace.mutate(t.id)
                    })}>
                    Replace key
                  </button>
                  <button type="button" className="btn-secondary" disabled={disconnect.isPending} style={{ color: 'var(--accent-danger)' }}
                    onClick={() => setConfirm({
                      isOpen: true, title: `Disconnect ${t.name}?`, confirmText: 'Disconnect', confirmStyle: 'danger',
                      message: 'Its key stops working for good. The till stops sending bills until a new key is made here and pasted in it. Bills it already sent are safe.',
                      onConfirm: () => disconnect.mutate(t.id)
                    })}>
                    Disconnect
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        confirmStyle={confirm.confirmStyle}
        onConfirm={() => { confirm.onConfirm?.(); setConfirm({ isOpen: false }); }}
        onClose={() => setConfirm({ isOpen: false })}
      />
    </div>
  );
}
