import React, { useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useChangeMyPassword } from '../hooks/useTeam';

/**
 * A Super Admin changing their own password, on the General Info tab. Laid out by
 * GeneralInfoPanel's stylesheet (the gi-* classes).
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

  const close = () => { setOpen(false); setShow(false); setForm({ currentPassword: '', newPassword: '', confirm: '' }); };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    try {
      await change.mutateAsync({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      close();
    } catch {
      // Toasted by the hook; the fields stay filled so a wrong current password is one retype.
    }
  };

  const warn = { margin: '6px 0 0', fontSize: '12px', color: 'var(--accent-warning, #f59e0b)' };

  return (
    <section className="gi-card" aria-labelledby="gi-password-title">
      <div className="gi-pass-head">
        <div className="gi-head">
          <div className="gi-head-icon"><Lock size={18} /></div>
          <div>
            <h2 id="gi-password-title">Password</h2>
            <p>{open
              ? 'Enter your current password, then the new one. You stay signed in here; every other device signed in to this account is signed out.'
              : 'The password you sign in with. Only you can change it.'}</p>
          </div>
        </div>
        {!open && (
          <button type="button" className="btn-secondary gi-btn" onClick={() => setOpen(true)}>
            <KeyRound size={15} /> Change password
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} style={{ marginTop: '18px' }}>
          <div className="gi-pass-fields">
            <div style={{ minWidth: 0 }}>
              <label className="gi-label" htmlFor="gi-pass-current">Current password</label>
              <input
                id="gi-pass-current" className="input-field" style={{ width: '100%' }} type="password" autoComplete="current-password"
                autoFocus value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <label className="gi-label" htmlFor="gi-pass-new">New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="gi-pass-new" className="input-field" style={{ width: '100%', paddingRight: '44px' }} type={show ? 'text' : 'password'} autoComplete="new-password"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                />
                {/* Shown rather than hidden on request: someone choosing a password they will have to
                    type on a shop-floor terminal should be able to see what they picked. */}
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide passwords' : 'Show passwords'}
                  style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Said as they type, not after they press the button. */}
              {tooShort && <p style={warn}>At least 8 characters.</p>}
            </div>

            <div style={{ minWidth: 0 }}>
              <label className="gi-label" htmlFor="gi-pass-confirm">Repeat new password</label>
              <input
                id="gi-pass-confirm" className="input-field" style={{ width: '100%' }} type={show ? 'text' : 'password'} autoComplete="new-password"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
              />
              {mismatch && <p style={warn}>The two new passwords do not match.</p>}
            </div>
          </div>

          <div className="gi-pass-actions">
            <button type="button" className="btn-secondary gi-btn" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary gi-btn" disabled={!ready || change.isPending}>
              {change.isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {change.isPending ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
