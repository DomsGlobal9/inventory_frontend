import React, { useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useChangeMyPassword } from '../hooks/useTeam';

/**
 * A Super Admin changing their own password, on the General Info tab.
 *
 * Shown only to a Super Admin. Everyone else's password is set for them by an admin and stays
 * permanent -- a shop assistant who changes their own leaves nobody able to help them back in.
 * The owner is the exception, because there is nobody above them to do the resetting.
 *
 * The current password is asked for, and the server checks it. Without that, a session left
 * open on a shop-floor machine is enough for anyone walking past to lock the owner out of
 * their own workspace.
 */
export default function ChangeOwnPassword() {
  const change = useChangeMyPassword();
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const mismatch = form.confirm.length > 0 && form.newPassword !== form.confirm;
  const ready = form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    await change.mutateAsync({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    setForm({ currentPassword: '', newPassword: '', confirm: '' });
    setOpen(false);
  };

  const field = { width: '100%', marginBottom: '10px' };

  if (!open) {
    return (
      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
        <button className="btn-secondary" onClick={() => setOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={15} /> Change my password
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
      <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-primary)' }}>Change my password</h4>
      <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        Only you can change this. It takes effect the next time you sign in.
      </p>

      <div style={{ maxWidth: '360px' }}>
        <input
          className="input-field" style={field} type="password" autoComplete="current-password"
          placeholder="Current password" value={form.currentPassword}
          onChange={e => setForm({ ...form, currentPassword: e.target.value })}
        />

        <div style={{ position: 'relative' }}>
          <input
            className="input-field" style={field} type={show ? 'text' : 'password'} autoComplete="new-password"
            placeholder="New password" value={form.newPassword}
            onChange={e => setForm({ ...form, newPassword: e.target.value })}
          />
          {/* Shown rather than hidden on request: someone choosing a password they will have to
              type on a shop-floor terminal should be able to see what they picked. */}
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: 'absolute', right: '10px', top: '9px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <input
          className="input-field" style={field} type={show ? 'text' : 'password'} autoComplete="new-password"
          placeholder="Repeat the new password" value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value })}
        />

        {/* Said as they type, not after they press the button. A mismatch discovered on submit
            means retyping both fields. */}
        {tooShort && (
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--accent-warning, #f59e0b)' }}>
            At least 8 characters.
          </p>
        )}
        {mismatch && (
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--accent-warning, #f59e0b)' }}>
            The two new passwords do not match.
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" className="btn-primary" disabled={!ready || change.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {change.isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {change.isPending ? 'Changing…' : 'Change password'}
          </button>
          <button type="button" className="btn-secondary"
            onClick={() => { setOpen(false); setForm({ currentPassword: '', newPassword: '', confirm: '' }); }}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
