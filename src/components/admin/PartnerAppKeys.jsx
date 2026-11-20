import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyRound, X, Loader2, Copy } from 'lucide-react';
import { api } from '../../lib/api';
import { useDialog } from '../../hooks/useDialog';

/**
 * Partner app keys (20 Nov 2026, PLAN-shop-api.md): the keys partner apps -- the Boutique app -- use to sell from a
 * boutique's online shop through Shop API v1. Made here (the key is shown ONCE), switched off here. A key reaches only
 * the shops linked to its boutique account, and each shop's own Online shop switch still decides whether it sells.
 */
const KEY = ['admin', 'shop-app-keys'];
const ago = (d) => {
  if (!d) return 'Never';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function Modal({ title, onClose, busy, children, footer }) {
  const titleId = useId();
  const ref = useDialog(true, { onClose, canClose: !busy });
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        style={{ background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: 480, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-modal)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button type="button" className="btn-icon" aria-label="Close" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'grid', gap: 12 }}>{children}</div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>
      </div>
    </div>,
    document.body
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: 'grid', gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
    {children}
  </label>
);

function MakeKey({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', tenant: '' });
  const [made, setMade] = useState(null);
  const make = useMutation({
    mutationFn: async () => (await api.post('/admin/shop-app-keys', form)).data,
    onSuccess: (k) => { setMade(k); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(e?.message || 'The key could not be made. Try again.')
  });
  if (made) {
    return (
      <Modal title="Copy the key now" onClose={onClose}
        footer={<button type="button" className="btn-primary" onClick={onClose}>Done</button>}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>
          This is the only time the key is shown. Give it to the app team for <b>{made.name}</b> ({made.tenant}).
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code data-testid="new-app-key" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 13, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>{made.key}</code>
          <button type="button" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigator.clipboard?.writeText(made.key).then(() => toast.success('Copied'), () => toast.error('Copy it by selecting the text.'))}>
            <Copy size={14} /> Copy
          </button>
        </div>
      </Modal>
    );
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title="Make a partner app key" onClose={onClose} busy={make.isPending}
      footer={<><button type="button" className="btn-secondary" onClick={onClose} disabled={make.isPending}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => make.mutate()} disabled={make.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {make.isPending && <Loader2 size={14} className="animate-spin" />} Make key</button></>}>
      <Field label="App name"><input className="input-field" value={form.name} onChange={set('name')} maxLength={80} placeholder="Boutique app (Android)" /></Field>
      <Field label="Boutique account"><input className="input-field" value={form.tenant} onChange={set('tenant')} maxLength={63} placeholder="swathy-reddy" /></Field>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>After you make it, the key is shown once. Copy it and give it to the app team.</p>
    </Modal>
  );
}

function Switch({ k }) {
  const qc = useQueryClient();
  const flip = useMutation({
    mutationFn: async (on) => (await api.post(`/admin/shop-app-keys/${k.id}/${on ? 'on' : 'off'}`)).data,
    onSuccess: (_d, on) => { toast.success(on ? `${k.name} works again.` : `${k.name} is switched off. It stops working within 30 seconds.`); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(e?.message || 'It could not be changed. Try again.')
  });
  const on = k.active;
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${k.name} on`} disabled={flip.isPending}
      onClick={() => flip.mutate(!on)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: on ? 'var(--accent-success, #16a34a)' : 'var(--text-secondary)' }}>
      {flip.isPending ? <Loader2 size={14} className="animate-spin" /> : (on ? 'On' : 'Off')}
      <span aria-hidden="true" style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', background: on ? 'var(--accent-success, #16a34a)' : 'var(--border-light)', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  );
}

export default function PartnerAppKeys() {
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get('/admin/shop-app-keys')).data });
  const [making, setMaking] = useState(false);
  const keys = data ?? [];
  const cell = { padding: '12px 10px', fontSize: 14, color: 'var(--text-primary)', borderTop: '1px solid var(--border-light)' };
  return (
    <section aria-labelledby="app-keys-title" data-testid="partner-app-keys" className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 id="app-keys-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} /> Partner app keys
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Apps that sell from a boutique's shop through Shop API v1. A key reaches only the shops linked to its boutique account.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setMaking(true)}>Make a key</button>
      </div>
      {isLoading ? (
        <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Loading</div>
      ) : keys.length === 0 ? (
        <div style={{ padding: '18px 20px', borderTop: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text-secondary)' }}>No partner app has a key yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 10px 8px 20px', fontWeight: 600 }}>App</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Boutique account</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Key starts</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Last used</th>
                <th style={{ padding: '8px 20px 8px 10px', fontWeight: 600, textAlign: 'right' }}>On</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} data-app-key={k.id} style={{ color: k.active ? undefined : 'var(--text-secondary)' }}>
                  <td style={{ ...cell, paddingLeft: 20 }}>{k.name}</td>
                  <td style={cell}><code>{k.tenant}</code></td>
                  <td style={cell}><code>{k.keyStartsWith}</code></td>
                  <td style={{ ...cell, color: 'var(--text-secondary)' }}>{ago(k.lastUsedAt)}</td>
                  <td style={{ ...cell, paddingRight: 20, textAlign: 'right' }}><Switch k={k} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-light)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
        Switched off, an app stops working within 30 seconds. Each shop's own Online shop switch still decides whether it sells.
      </div>
      {making && <MakeKey onClose={() => setMaking(false)} />}
    </section>
  );
}
