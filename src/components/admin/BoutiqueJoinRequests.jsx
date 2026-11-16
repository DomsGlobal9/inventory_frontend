import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Scissors, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useDialog } from '../../hooks/useDialog';

/**
 * Boutique clients waiting to join ScaleEzy Inventory (16 Nov), on top of the Console's Clients page.
 *
 * CRM-B's own console asks for a client it runs on its own; the request waits here. Accept onboards the client exactly
 * like the Onboarding screen, with the boutique account: an owner login is sent, and the boutique's items, stock and
 * history move into the new shop. Decline needs a reason, which the boutique app is shown. Nothing shows when nothing
 * is waiting.
 */

const KEY = ['admin', 'boutique-join-requests'];
export const useBoutiqueJoinRequests = () => useQuery({
  queryKey: KEY,
  queryFn: async () => (await api.get('/admin/boutique-join-requests')).data,
  refetchInterval: 60_000
});

const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function Modal({ title, onClose, busy, children, footer }) {
  const titleId = useId();
  const ref = useDialog(true, { onClose, canClose: !busy });
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        style={{ background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: 520, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-modal)', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column' }}>
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

function AcceptDialog({ r, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ shopName: r.shopName, ownerName: r.ownerName, ownerEmail: r.ownerEmail, ownerPhone: r.ownerPhone });
  const [done, setDone] = useState(null);
  const sending = useRef(false);
  const accept = useMutation({
    mutationFn: async () => (await api.post(`/admin/boutique-join-requests/${r.id}/accept`, form)).data,
    onSuccess: (data) => { setDone(data); qc.invalidateQueries({ queryKey: KEY }); qc.invalidateQueries({ queryKey: ['admin', 'clients'] }); },
    onError: (e) => toast.error(e?.message || 'The client could not be set up. Try again.'),
    onSettled: () => { sending.current = false; }
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const go = () => { if (sending.current) return; sending.current = true; accept.mutate(); };

  if (done) {
    return (
      <Modal title={`${form.shopName} is on ScaleEzy`} onClose={onClose}
        footer={<><Link className="btn-secondary" to={`/platformconsole/clients/${done.clientId}`}>Open the client</Link><button type="button" className="btn-primary" onClick={onClose}>Done</button></>}>
        <p style={{ margin: 0, fontSize: 14 }}>The shop is ready, and the boutique's items, stock and history are in it.</p>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          {done.emailed ? `The owner's login was emailed to ${done.adminEmail}.` : `The login email could not be sent (${done.emailReason || 'mail is off'}). Give the owner this password yourself: `}
          {!done.emailed && <code>{done.tempPassword}</code>}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>The boutique app changes nothing: its next call lands in this shop.</p>
      </Modal>
    );
  }
  return (
    <Modal title="Accept and set up the client" onClose={onClose} busy={accept.isPending}
      footer={<><button type="button" className="btn-secondary" onClick={onClose} disabled={accept.isPending}>Cancel</button>
        <button type="button" className="btn-primary" onClick={go} disabled={accept.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {accept.isPending && <Loader2 size={15} className="animate-spin" />} Accept and set up</button></>}>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>
        This makes <strong>{r.tenant}</strong> a ScaleEzy client. The owner gets a login by email, and everything the boutique
        holds for them ({fmt(r.holdings?.items)} {r.holdings?.items === 1 ? 'item' : 'items'}) moves into the new shop. Correct the details first if needed.
      </p>
      <Field label="Shop name"><input className="input-field" value={form.shopName} onChange={set('shopName')} maxLength={120} /></Field>
      <Field label="Owner's name"><input className="input-field" value={form.ownerName} onChange={set('ownerName')} maxLength={120} /></Field>
      <Field label="Owner's email (the login goes here)"><input className="input-field" type="email" value={form.ownerEmail} onChange={set('ownerEmail')} maxLength={160} /></Field>
      <Field label="Owner's mobile"><input className="input-field" inputMode="tel" value={form.ownerPhone} onChange={set('ownerPhone')} maxLength={20} /></Field>
    </Modal>
  );
}

function DeclineDialog({ r, onClose }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const decline = useMutation({
    mutationFn: async () => (await api.post(`/admin/boutique-join-requests/${r.id}/decline`, { reason })).data,
    onSuccess: () => { toast.success('Declined. The boutique is told why.'); qc.invalidateQueries({ queryKey: KEY }); onClose(); },
    onError: (e) => toast.error(e?.message || 'It could not be declined. Try again.')
  });
  return (
    <Modal title={`Decline ${r.shopName}?`} onClose={onClose} busy={decline.isPending}
      footer={<><button type="button" className="btn-secondary" onClick={onClose} disabled={decline.isPending}>Cancel</button>
        <button type="button" className="btn-danger" onClick={() => decline.mutate()} disabled={decline.isPending || reason.trim().length < 3}>Decline</button></>}>
      <Field label="Why (the boutique is shown this)">
        <textarea className="input-field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Please call us first to choose a plan." />
      </Field>
    </Modal>
  );
}

export default function BoutiqueJoinRequests() {
  const { data } = useBoutiqueJoinRequests();
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const waiting = (data ?? []).filter(r => r.status === 'WAITING' || r.status === 'ACCEPTING');
  // The accept dialog stays open after its card leaves the list: it shows the result ("is on ScaleEzy").
  if (!waiting.length && !accepting) return null;

  return (
    <section aria-labelledby="join-title" data-testid="boutique-join-requests" style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 id="join-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scissors size={16} /> Waiting to join ({waiting.length})
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Boutique clients asking, from the boutique app, to use ScaleEzy Inventory.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {waiting.map(r => (
          <div key={r.id} data-join-card={r.tenant} style={{ border: '1px solid var(--accent-gold)', borderRadius: 12, background: 'var(--bg-card)', padding: 16, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{r.shopName}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Boutique account <code>{r.tenant}</code></div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>{r.status === 'ACCEPTING' ? 'Setting up' : 'Waiting'}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'grid', gap: 2 }}>
              <span>{r.ownerName}</span>
              <span style={{ color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{r.ownerEmail}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{r.ownerPhone}{r.city ? `, ${r.city}` : ''}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {r.holdings?.state === 'boutique-only'
                ? <>In the boutique: <strong style={{ color: 'var(--text-primary)' }}>{fmt(r.holdings.items)} {r.holdings.items === 1 ? 'item' : 'items'}</strong>{r.holdings.metres ? `, ${fmt(r.holdings.metres)} m of cloth` : ''}{r.holdings.pieces ? `, ${fmt(r.holdings.pieces)} pieces` : ''}</>
                : 'Nothing in the boutique yet.'}
            </div>
            {r.note && <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-input)', borderRadius: 8, padding: '8px 10px' }}>"{r.note}"</div>}
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Asked {when(r.createdAt)}{r.requestedBy ? ` by ${r.requestedBy}` : ''}</div>
            {r.reason && <div role="status" style={{ fontSize: 12.5, color: 'var(--accent-danger)' }}>Last try: {r.reason}</div>}
            {(r.problems ?? []).map(p => <div key={p} role="status" style={{ fontSize: 12.5, color: 'var(--accent-danger)' }}>{p}</div>)}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
              <button type="button" className="btn-secondary" disabled={r.status !== 'WAITING'} onClick={() => setDeclining(r)}>Decline</button>
              <button type="button" className="btn-primary" disabled={r.status !== 'WAITING'} onClick={() => setAccepting(r)}>Accept</button>
            </div>
          </div>
        ))}
      </div>
      {accepting && <AcceptDialog r={accepting} onClose={() => setAccepting(null)} />}
      {declining && <DeclineDialog r={declining} onClose={() => setDeclining(null)} />}
    </section>
  );
}
