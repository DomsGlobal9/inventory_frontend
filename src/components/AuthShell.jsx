import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The frame around signing in and signing up.
 *
 * Both pages used to paint themselves: hardcoded black, hardcoded white text, hardcoded
 * gradients. That meant three things. They ignored the light theme entirely. They looked like
 * a different product from the page the visitor had just come from. And any change to one had
 * to be remembered in the other, which is how they had already drifted apart.
 *
 * So the frame lives here and the pages supply only their own words and fields. It uses the
 * app's own tokens throughout, which is what makes it follow the theme without being asked.
 */

/** One field, sized for a thumb rather than a mouse. */
export const authField = {
  width: '100%',
  height: '52px',
  padding: '0 18px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-light)',
  borderRadius: '14px',
  color: 'var(--text-primary)',
  fontSize: '15.5px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color .18s ease, box-shadow .18s ease'
};

export const authLabel = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '9px'
};

/** The one green button on the page, so there is never a question which one submits. */
export const authPrimary = (busy) => ({
  width: '100%',
  height: '54px',
  marginTop: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  borderRadius: '999px',
  border: 'none',
  background: 'var(--brand-solid)',
  color: 'var(--brand-on-solid)',
  fontSize: '16px',
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: busy ? 'wait' : 'pointer',
  opacity: busy ? 0.75 : 1,
  boxShadow: '0 14px 30px -12px color-mix(in srgb, var(--brand-solid) 65%, transparent)',
  transition: 'transform .18s ease, opacity .18s ease'
});

export default function AuthShell({ eyebrow, title, subtitle, children, footer, aside }) {
  return (
    <div style={{
      minHeight: '100vh', width: '100%', position: 'relative', overflowX: 'hidden',
      background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column'
    }}>
      <style>{`
        .auth-field:focus {
          border-color: var(--brand-ink) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent);
        }
        .auth-primary:hover:not(:disabled) { transform: translateY(-1px); }
        @media (max-width: 899px) { .auth-aside { display: none !important; } }
        @media (prefers-reduced-motion: reduce) { .auth-primary:hover { transform: none; } }
      `}</style>

      {/* Same light thrown from behind as the landing page's hero, so arriving here does not
          feel like arriving somewhere else. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(46% 40% at 22% 8%, color-mix(in srgb, var(--brand) 18%, transparent) 0%, transparent 66%),
          radial-gradient(40% 38% at 84% 92%, color-mix(in srgb, var(--brand) 12%, transparent) 0%, transparent 66%)`
      }} />

      <header style={{ position: 'relative', padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 48px)' }}>
        <Link to="/" aria-label="Scaleezy home" style={{ display: 'inline-flex' }}>
          <img src="/scaleezy-logo.png" alt="Scaleezy" style={{ height: '34px', objectFit: 'contain' }} />
        </Link>
      </header>

      <main style={{
        position: 'relative', flex: 1, width: '100%', maxWidth: '1180px',
        margin: '0 auto', padding: '0 clamp(20px, 4vw, 40px) clamp(40px, 6vw, 72px)',
        display: 'grid', gap: 'clamp(32px, 6vw, 80px)', alignItems: 'center',
        gridTemplateColumns: aside ? 'minmax(0, 1fr) minmax(0, 0.85fr)' : 'minmax(0, 1fr)',
        justifyItems: aside ? undefined : 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>
          {eyebrow && (
            <p style={{
              margin: '0 0 14px', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-ink)'
            }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{
            margin: '0 0 12px', fontSize: 'clamp(28px, 4.2vw, 42px)', fontWeight: 500,
            lineHeight: 1.12, letterSpacing: '-0.02em', color: 'var(--text-primary)'
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: '0 0 32px', fontSize: '16px', lineHeight: 1.6,
              color: 'var(--text-secondary)', maxWidth: '44ch'
            }}>
              {subtitle}
            </p>
          )}

          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: 'clamp(20px, 3vw, 28px)', padding: 'clamp(24px, 4vw, 34px)',
            boxShadow: '0 30px 60px -30px rgba(0,0,0,0.4)'
          }}>
            {children}
          </div>

          {footer && (
            <p style={{ margin: '24px 0 0', fontSize: '14.5px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {footer}
            </p>
          )}
        </div>

        {aside && <div className="auth-aside">{aside}</div>}
      </main>
    </div>
  );
}
