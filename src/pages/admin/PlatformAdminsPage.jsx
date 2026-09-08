import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Loader2, KeyRound, Copy, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  usePlatformAdmins, useCreatePlatformAdmin, useSetPlatformAdminStatus, useResetPlatformAdminPassword
} from '../../hooks/admin/useAdminConsole';

/**
 * Who can reach this console.
 *
 * Deliberately the plainest screen in the product. Everyone in this list can read and act on
 * every tenant's data, so it shows exactly four things -- add, activate, deactivate, issue a
 * new password -- and nothing that invites browsing.
 *
 * There is no "view password" here, unlike the shop-side Team screen. Platform admin passwords
 * are stored only as a one-way hash: a decryptable copy of a key that opens every shop on the
 * platform is a far larger prize than a shop assistant's, so it is not kept.
 */

function OnceOnlyPassword({ name, email, password, emailed, emailReason, onDone }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  return (
    <div style={{
      border: '1px solid var(--accent-gold, #e2c171)', background: 'rgba(226,193,113,0.08)',
      borderRadius: '12px', padding: '20px', marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <strong style={{ fontSize: '15px' }}>Password for {name}</strong>
        <button onClick={onDone} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: '13px', background: 'var(--bg-input,#f6f6f4)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div>Email: {email}</div>
        <div>Password: {password}</div>
      </div>

      {/* Stated plainly because it is genuinely irreversible, and the alternative -- finding
          out later that nobody wrote it down -- means issuing a new one and telling the person
          their password changed for no reason they can see. */}
      <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: 'var(--accent-warning,#f59e0b)', margin: '0 0 12px' }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          This is the only time this password can be read. It is not stored in a form anyone can
          recover — if it is lost, the only option is to issue a new one.
        </span>
      </p>

      <p style={{ fontSize: '12.5px', color: emailed ? 'var(--accent-success,#22c55e)' : 'var(--accent-warning,#f59e0b)', margin: '0 0 12px' }}>
        {emailed ? `Emailed to ${email}.` : `Not emailed: ${emailReason ?? 'unknown reason'}`}
      </p>

      <button onClick={copy} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function PlatformAdminsPage() {
  const { data: admins = [], isLoading } = usePlatformAdmins();
  const create = useCreatePlatformAdmin();
  const setStatus = useSetPlatformAdminStatus();
  const reset = useResetPlatformAdminPassword();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [revealed, setRevealed] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    const result = await create.mutateAsync({ name: form.name.trim(), email: form.email.trim() });
    setRevealed(result);
    setForm({ name: '', email: '' });
    setShowForm(false);
  };

  const issueNewPassword = async (admin) => {
    const result = await reset.mutateAsync(admin.id);
    setRevealed(result);
  };

  const activeCount = admins.filter(a => a.status === 'ACTIVE').length;

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={24} /> Platform Admins
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary,#666)' }}>
          Everyone listed here can see and act on every tenant on the platform. Keep it short.
        </p>
      </header>

      {revealed && (
        <OnceOnlyPassword
          name={revealed.name} email={revealed.email} password={revealed.password}
          emailed={revealed.emailed} emailReason={revealed.emailReason}
          onDone={() => setRevealed(null)}
        />
      )}

      {showForm ? (
        <form onSubmit={submit} style={{ border: '1px solid var(--border-light,#e5e5e0)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px' }}>Add a platform admin</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input className="input-field" placeholder="Full name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} style={{ flex: 1, minWidth: '200px' }} />
            <input className="input-field" type="email" placeholder="name@scaleezy.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} style={{ flex: 1, minWidth: '220px' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted,#888)', margin: '0 0 14px' }}>
            A password is generated and emailed to them. It is shown here once and cannot be
            retrieved afterwards.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-primary" disabled={create.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {create.isPending ? 'Adding…' : 'Add admin'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn-primary" onClick={() => setShowForm(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <UserPlus size={16} /> Add platform admin
        </button>
      )}

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={22} className="animate-spin" /></div>
      ) : (
        <div style={{ border: '1px solid var(--border-light,#e5e5e0)', borderRadius: '12px', overflow: 'hidden' }}>
          {admins.map((admin, index) => (
            <div key={admin.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '14px 18px', borderTop: index === 0 ? 'none' : '1px solid var(--border-light,#e5e5e0)'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{admin.name}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary,#666)' }}>{admin.email}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '.04em',
                  color: admin.status === 'ACTIVE' ? 'var(--accent-success,#22c55e)' : 'var(--text-muted,#888)'
                }}>
                  {admin.status}
                </span>

                <button className="btn-secondary" disabled={reset.isPending}
                  onClick={() => issueNewPassword(admin)}
                  title="Issue a new password and email it"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px' }}>
                  <KeyRound size={14} /> New password
                </button>

                {/* Deactivating the last active admin would lock everyone out of this console
                    permanently, so the button is not offered when only one remains. The server
                    refuses it as well -- this just avoids presenting a dead action. */}
                {admin.status === 'ACTIVE' ? (
                  <button className="btn-secondary" disabled={setStatus.isPending || activeCount <= 1}
                    title={activeCount <= 1 ? 'This is the only active admin' : 'Deactivate'}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'INACTIVE' })}
                    style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn-secondary" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'ACTIVE' })}
                    style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
