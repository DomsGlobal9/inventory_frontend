import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

/**
 * The frame around signing in and signing up.
 *
 * Two columns: what this is on the left, what to fill in on the right. A form centred under
 * its own heading makes the page about the form; setting the words beside it means the reason
 * to sign up is still on screen while someone is deciding whether to.
 *
 * Both pages used to paint themselves -- hardcoded black, hardcoded white text, hardcoded
 * gradients -- so they ignored the light theme, looked like a different product from the page
 * the visitor arrived from, and drifted apart from each other. The frame lives here now and
 * the pages supply only their own words and fields.
 */

/** One field. 52px because a thumb is about 45px and a mouse does not mind the extra. */
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

export default function AuthShell({ eyebrow, title, subtitle, points = [], children, footer }) {
  return (
    <div className="auth-page">
      <style>{`
        /**
         * Its own scroll container, because the app deliberately has none.
         *
         * index.css gives html, body and #root 'overflow: hidden' -- "zero global scroll" --
         * so the table screens can manage their own scrolling. That means growing the page
         * taller does nothing here: whatever hangs below the fold is CLIPPED, not scrolled to.
         * Reports and the Day Book already hit this and have .page-scroll for it; this is the
         * same answer for the signed-out pages.
         *
         * dvh as well as vh: on a phone 100vh is the height the window would have with the
         * browser's own bars hidden, so the last 60-80px of a 100vh page sits underneath the
         * address bar. dvh is the height actually visible.
         */
        .auth-page {
          height: 100vh;
          height: 100dvh;
          overflow-y: auto;
          overscroll-behavior: contain;
          width: 100%; position: relative; overflow-x: hidden;
          background: var(--bg-dark); display: flex; flex-direction: column;
        }
        /* The same light thrown from behind as the landing page's hero, so arriving here does
           not feel like arriving somewhere else. */
        .auth-page::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(42% 46% at 16% 6%, color-mix(in srgb, var(--brand) 20%, transparent) 0%, transparent 66%),
            radial-gradient(36% 40% at 88% 96%, color-mix(in srgb, var(--brand) 13%, transparent) 0%, transparent 66%);
        }

        /* flex: none, so the header keeps its height instead of being squeezed when the form
           below it is tall. */
        .auth-head { flex: none; position: relative; padding: clamp(22px, 3vw, 34px) clamp(20px, 4vw, 52px); }

        /**
         * Centred when there is room, scrollable when there is not.
         *
         * This was 'flex: 1' with 'align-content: center', and the two together made a form
         * taller than the window unreachable. 'flex: 1' is shorthand for '1 1 0%' -- grow to
         * fill, and shrink to nothing -- so this row was pinned to exactly the space left over
         * after the header, whatever its contents needed. 'align-content: center' then centred
         * the overflow, pushing the bottom of the card past the window while the page's
         * scrollHeight stayed equal to the viewport, so there was nothing to scroll to.
         *
         * Measured at 1000x620, which is an ordinary laptop with a browser toolbar: the card is
         * 706px tall, ran 184px past the bottom, and the Send request button could not be
         * reached at all. Adding a validation message under a field makes the card taller
         * still, so the page got worse exactly when somebody needed it most.
         *
         * 'flex: 1 0 auto' grows to fill the leftover space but never shrinks below what the
         * content needs, so the page itself becomes taller and scrolls. 'safe center' keeps the
         * centring while refusing to push content off the START edge -- the failure that cannot
         * be scrolled back to. Browsers without 'safe' fall back to the plain 'center' above it,
         * which is what they do today, so nothing regresses.
         */
        .auth-body {
          position: relative; flex: 1 0 auto; width: 100%; max-width: 1200px; margin: 0 auto;
          padding: clamp(16px, 3vw, 32px) clamp(20px, 4vw, 52px) clamp(48px, 7vw, 88px);
          display: grid; align-items: center;
          align-content: center;
          align-content: safe center;
          gap: clamp(40px, 7vw, 96px);
          grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
        }

        .auth-say { max-width: 100%; }
        .auth-eyebrow {
          margin: 0 0 16px; font-size: 12px; font-weight: 700;
          letter-spacing: .13em; text-transform: uppercase; color: var(--brand-ink);
        }
        .auth-title {
          margin: 0 0 18px; color: var(--text-primary);
          font-size: clamp(34px, 4.4vw, 56px); font-weight: 600;
          line-height: 1.06; letter-spacing: -.035em;
        }
        .auth-sub {
          margin: 0; color: var(--text-secondary); max-width: 38ch;
          font-size: clamp(16px, 1.5vw, 18px); line-height: 1.6;
        }

        .auth-points { list-style: none; margin: 40px 0 0; padding: 0; display: grid; gap: 17px; max-width: 40ch; }
        .auth-point { display: flex; align-items: flex-start; gap: 13px; color: var(--text-secondary); font-size: 15px; line-height: 1.5; }
        .auth-tick {
          flex: 0 0 auto; width: 21px; height: 21px; margin-top: 1px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--brand) 22%, transparent);
          color: var(--brand-ink);
        }

        .auth-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: clamp(22px, 2.4vw, 30px);
          padding: clamp(26px, 3vw, 38px);
          box-shadow: 0 40px 80px -40px rgba(0,0,0,.45), 0 2px 10px rgba(0,0,0,.05);
        }
        .auth-foot { margin: 22px 0 0; font-size: 14.5px; color: var(--text-secondary); text-align: center; }
        /**
         * A thumb-sized target without a thumb-sized link.
         *
         * "Sign in" here measured 20px tall on a 320px phone -- and it is the ONLY way from
         * this page to the other one, so somebody who opened the wrong form has one small word
         * to hit. The padding grows the tap area to 44px, the negative margin takes the space
         * back out of the layout, so it reads exactly as before and is twice as easy to hit.
         *
         * The app already applies a 44px minimum to buttons and sidebar links below 768px; the
         * signed-out pages were never included.
         */
        .auth-foot a {
          display: inline-block;
          padding: 12px 6px;
          margin: -12px 0;
          font-weight: 600;
          color: var(--brand-ink);
        }

        .auth-field:focus {
          border-color: var(--brand-ink) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 22%, transparent);
        }
        .auth-primary:hover:not(:disabled) { transform: translateY(-1px); }

        /* One column below the width where two would each be too narrow to be comfortable.
           The reasons drop rather than the form: someone on a phone who reached this page has
           already decided, and three more lines between them and the fields is an obstacle. */
        @media (max-width: 899px) {
          .auth-body { grid-template-columns: minmax(0, 1fr); gap: 30px; justify-items: center; }
          .auth-say { max-width: 34ch; text-align: center; }
          .auth-sub { max-width: none; }
          .auth-points { display: none; }
          .auth-right { width: 100%; max-width: 460px; }
        }
        @media (prefers-reduced-motion: reduce) { .auth-primary:hover { transform: none; } }
      `}</style>

      <header className="auth-head">
        <Link to="/" aria-label="Scaleezy home" style={{ display: 'inline-flex' }}>
          <img src="/scaleezy-logo.png" alt="Scaleezy" style={{ height: '34px', objectFit: 'contain' }} />
        </Link>
      </header>

      <main className="auth-body">
        <div className="auth-say">
          {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}

          {points.length > 0 && (
            <ul className="auth-points">
              {points.map((p, i) => (
                <li key={i} className="auth-point">
                  <span className="auth-tick" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="auth-right">
          <div className="auth-card">{children}</div>
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
