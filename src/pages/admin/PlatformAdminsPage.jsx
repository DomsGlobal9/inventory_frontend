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

/**
 * Choosing between a generated password and one you type.
 *
 * Shared by "add an admin" and "reset a password" because the choice, the rules and the
 * warnings are identical -- and if they were written twice they would eventually disagree
 * about the minimum length.
 */
function PasswordChoice({ mode, setMode, value, setValue }) {
  const tooShort = value.length > 0 && value.length < 12;

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Password
      </label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: mode === 'custom' ? '10px' : 0 }}>
        {['auto', 'custom'].map(option => (
          <button
            key={option} type="button" onClick={() => setMode(option)}
            style={{
              flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              border: `1px solid ${mode === option ? 'var(--accent-gold)' : 'var(--border-light)'}`,
              background: mode === option ? 'rgba(226,193,113,0.12)' : 'var(--bg-card)',
              color: mode === option ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}
          >
            {option === 'auto' ? 'Generate one' : 'I will type one'}
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <>
          <input
            className="input-field" type="text" autoComplete="new-password"
            placeholder="At least 12 characters" value={value}
            onChange={e => setValue(e.target.value)} style={{ width: '100%' }}
          />
          {/* Longer than the shop-side minimum, because this one account can reach every
              tenant on the platform. Said as they type rather than on submit. */}
          {tooShort && (
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--accent-warning,#f59e0b)' }}>
              At least 12 characters — this account can see every tenant.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Confirms a password reset before doing it.
 *
 * There was no confirmation at all, and the button caused an irreversible change: the admin's
 * current password stops working the instant it runs, whether or not anyone reads the new one.
 * A misclick on a card in a grid used to be enough to lock a colleague out with no warning.
 */
function ResetDialog({ admin, busy, onCancel, onConfirm }) {
  const [mode, setMode] = useState('auto');
  const [custom, setCustom] = useState('');
  const ready = mode === 'auto' || custom.length >= 12;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={busy ? undefined : onCancel}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '460px' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={18} color="var(--accent-gold)" /> New password for {admin.name}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {admin.email}
        </p>

        <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '8px', borderLeft: '3px solid var(--accent-warning,#f59e0b)', marginBottom: '20px' }}>
          <AlertTriangle size={16} color="var(--accent-warning,#f59e0b)" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Their current password stops working immediately. The new one is emailed to them and
            shown here once — it cannot be read again afterwards.
          </p>
        </div>

        <PasswordChoice mode={mode} setMode={setMode} value={custom} setValue={setCustom} />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" disabled={!ready || busy}
            onClick={() => onConfirm(mode === 'custom' ? custom : undefined)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '42px' }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {/* Named steps rather than a bare spinner: this takes a few seconds because it
                hashes, writes and then waits on a mail server, and "Emailing…" tells the
                operator which of those they are waiting for. */}
            {busy ? 'Changing and emailing…' : 'Change the password'}
          </button>
          <button className="btn-secondary" onClick={onCancel} disabled={busy} style={{ minHeight: '42px' }}>
            Cancel
          </button>
        </div>
      </div>
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
  const [passwordMode, setPasswordMode] = useState('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [revealed, setRevealed] = useState(null);
  const [resetting, setResetting] = useState(null);

  const customReady = passwordMode === 'auto' || customPassword.length >= 12;
  const formReady = form.name.trim() && form.email.trim() && customReady;

  const submit = async (e) => {
    e.preventDefault();
    if (!formReady) return;
    const result = await create.mutateAsync({
      name: form.name.trim(),
      email: form.email.trim(),
      customPassword: passwordMode === 'custom' ? customPassword : undefined
    });
    setRevealed(result);
    setForm({ name: '', email: '' });
    setPasswordMode('auto');
    setCustomPassword('');
    setShowForm(false);
  };

  const confirmReset = async (chosenPassword) => {
    const result = await reset.mutateAsync({ id: resetting.id, customPassword: chosenPassword });
    setResetting(null);
    setRevealed(result);
  };

  const activeCount = admins.filter(a => a.status === 'ACTIVE').length;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <header>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'rgba(226, 193, 113, 0.15)', color: 'var(--accent-gold)', borderRadius: '10px' }}>
              <ShieldCheck size={22} />
            </div>
            Platform Admins
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.5 }}>
            Everyone listed here can see and act on every tenant on the platform. Keep this list short and strictly monitored.
          </p>
        </header>

        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600 }}>
            <UserPlus size={18} /> Add Platform Admin
          </button>
        )}
      </div>

      {revealed && (
        <div style={{ marginBottom: '32px' }}>
          <OnceOnlyPassword
            name={revealed.name} email={revealed.email} password={revealed.password}
            emailed={revealed.emailed} emailReason={revealed.emailReason}
            onDone={() => setRevealed(null)}
          />
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} color="var(--accent-gold)" /> Add a new platform admin
          </h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
              <input className="input-field" placeholder="E.g. Jane Doe" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
              <input className="input-field" type="email" placeholder="name@scaleezy.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          <PasswordChoice
            mode={passwordMode} setMode={setPasswordMode}
            value={customPassword} setValue={setCustomPassword}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '24px', borderLeft: '3px solid var(--accent-gold)' }}>
            <AlertTriangle size={16} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              The password is emailed to them and shown here once. It cannot be retrieved afterwards.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-primary" disabled={!formReady || create.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', minHeight: '44px' }}>
              {create.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {/* "Creating and emailing" rather than "Creating": the wait is mostly the mail
                  server, and naming it stops the pause looking like the app has hung. */}
              {create.isPending ? 'Creating and emailing…' : 'Confirm & Add Admin'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{ minHeight: '44px' }}>Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}><Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-gold)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {admins.map((admin) => (
            <div key={admin.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Top Status Border */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: admin.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-muted)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--bg-input) 0%, var(--bg-dark) 100%)',
                    border: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)'
                  }}>
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {admin.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {admin.email}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '.05em',
                  background: admin.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(136, 136, 136, 0.1)',
                  color: admin.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-muted)'
                }}>
                  <ShieldCheck size={12} />
                  {admin.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                {/* Scoped to THIS row. A bare `reset.isPending` spins every card in the grid
                    at once, so the operator cannot tell which admin they actually clicked. */}
                {(() => {
                  const busy = reset.isPending && reset.variables?.id === admin.id;
                  return (
                    <button className="btn-secondary" disabled={reset.isPending}
                      onClick={() => setResetting(admin)}
                      title="Issue a new password and email it"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', minHeight: '40px' }}>
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                      {busy ? 'Working…' : 'Reset Pass'}
                    </button>
                  );
                })()}

                {admin.status === 'ACTIVE' ? (
                  <button className="btn-secondary" disabled={setStatus.isPending || activeCount <= 1}
                    title={activeCount <= 1 ? 'This is the only active admin' : 'Deactivate'}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'INACTIVE' })}
                    style={{ flex: 1, fontSize: '13px', minHeight: '40px', color: activeCount <= 1 ? 'var(--text-muted)' : 'var(--accent-warning)' }}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn-secondary" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'ACTIVE' })}
                    style={{ flex: 1, fontSize: '13px', minHeight: '40px', color: 'var(--accent-success)' }}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resetting && (
        <ResetDialog
          admin={resetting}
          busy={reset.isPending}
          onCancel={() => setResetting(null)}
          onConfirm={confirmReset}
        />
      )}
    </div>
  );
}
