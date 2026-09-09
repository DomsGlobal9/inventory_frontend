import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowRight, Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthShell, { authField, authLabel, authPrimary } from '../components/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Only populated in the rare case where the same email+password combination
  // matches more than one workspace -- see auth.controller.ts's `login`.
  const [workspaceChoices, setWorkspaceChoices] = useState(null);

  // "/" is the public marketing page now, not the dashboard. Sending a freshly signed-in
  // user there looked exactly like a failed login: correct password, and you land back on
  // the page that invites you to sign up. `from` is also ignored when it points at "/" or
  // the login page itself, so a bounce through either does not send you straight back.
  const requested = location.state?.from;
  const redirectTo = !requested || requested === '/' || requested.startsWith('/login')
    ? '/dashboard'
    : requested;

  const attemptLogin = async (clientId) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password, clientId);
      if (result?.requiresWorkspaceSelection) {
        setWorkspaceChoices(result.workspaces);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await attemptLogin();
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your shop"
      subtitle="Your stock, your costs and your margins, exactly where you left them."
      points={[
        'Every movement still on the ledger, none of it overwritten',
        'What each piece cost, and what it leaves you',
        'Every shop you keep stock in, and the total across them'
      ]}
      footer={
        <>
          Don&apos;t have a workspace?{' '}
          <Link to="/signup" style={{ color: 'var(--brand-ink)', textDecoration: 'none', fontWeight: 600 }}>
            Request access
          </Link>
        </>
      }
    >
      {workspaceChoices ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: 1.6, margin: '0 0 4px' }}>
            This email is used in more than one shop. Choose which one to sign into.
          </p>
          {workspaceChoices.map(w => (
            <button
              key={w.clientId}
              onClick={() => attemptLogin(w.clientId)}
              disabled={isSubmitting}
              style={{
                ...authField,
                display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1, fontWeight: 500
              }}
            >
              <Building2 size={18} style={{ color: 'var(--brand-ink)', flexShrink: 0 }} />
              {w.clientId}
            </button>
          ))}
          <button
            onClick={() => setWorkspaceChoices(null)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              fontSize: '13.5px', cursor: 'pointer', padding: '6px', fontFamily: 'inherit'
            }}
          >
            ← Back
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="email" style={authLabel}>Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.com"
              className="auth-field"
              style={authField}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="password" style={authLabel}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="auth-field"
                style={{ ...authField, paddingRight: '52px' }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '10px',
                  color: 'var(--text-muted)', display: 'flex'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/*
            The message goes above the button, not below it. Below, it sits under the thumb on a
            phone and off the bottom of a short window -- so the form reads as having done
            nothing at all when the password was simply wrong.
          */}
          {error && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '13px 16px', borderRadius: '14px',
              background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-danger) 30%, transparent)',
              color: 'var(--accent-danger)', fontSize: '14px', lineHeight: 1.5
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-primary" disabled={isSubmitting} style={authPrimary(isSubmitting)}>
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
