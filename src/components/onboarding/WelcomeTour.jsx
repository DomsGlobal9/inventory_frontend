import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft, Compass } from 'lucide-react';
import { api } from '../../lib/api';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';

/**
 * The short look around, shown once to somebody who has never seen it.
 *
 * Rules it lives by, in order of importance:
 *
 *   once        The account remembers it (users.tour_seen_at), so it does not come back on a
 *               phone, a second computer, or after the browser is cleared. If saving that fails,
 *               the browser remembers instead -- nagging somebody is worse than forgetting.
 *   honest      A step is only shown if the person's role can use that part AND the thing is
 *               actually on the screen. On a phone the search box is hidden, so that step is not
 *               shown; a salesperson is never shown the alerts bell they will find empty.
 *   escapable   Skip, Esc, or the × at any point. It is a welcome, not a gate.
 *
 * Anyone can ask for it again from Settings → Help & Support, which fires `scaleezy:start-tour`.
 */
const SEEN_KEY = 'scaleezy_tour_seen';
export const START_TOUR_EVENT = 'scaleezy:start-tour';

/** Each step: what to point at, what to say, and who it is for. */
const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ScaleEzy',
    text: 'A quick look around, about a minute. You can stop at any time.',
  },
  {
    id: 'menu',
    target: '[data-tour="sidebar"]',
    phoneTarget: '[data-tour="menu-button"]',
    title: 'Everything your shop does',
    text: 'Products, sales, stock, shelves, purchase orders and settings all live in this menu.',
  },
  {
    id: 'store',
    target: '[data-tour="store-switcher"]',
    title: 'The store you are working in',
    text: 'Stock, sales and shelves always belong to the store shown here. Change it to work in another store or godown.',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Find anything quickly',
    text: 'Type a name, SKU or order number — or scan a barcode with a scanner.',
  },
  {
    id: 'alerts',
    target: '[data-tour="alerts"]',
    permission: 'inventory:view',
    title: 'When stock runs low',
    text: 'The bell tells you what has run out or is close to it.',
  },
  {
    id: 'help',
    target: '[data-tour="help"]',
    title: 'Help for the screen you are on',
    text: 'This opens the guide for whatever screen you are looking at, with pictures. It is also at inventory.scaleezy.com/help.',
  },
  {
    id: 'first',
    title: 'Where to start',
    // The first useful thing to do differs by what the person is allowed to do.
    byPermission: [
      ['product:create', 'Add your products first: Products → Add Product. Then your stock has something to sit against.'],
      ['sales_order:counter_sale', 'Ring up your first sale: Orders → New sale. Scan the tag, take the money, print the bill.'],
      ['shelf:putaway', 'Put today\'s delivery away: Shelves → Put away. Scan the tag, then the shelf label.'],
      ['inventory:view', 'Look at your stock: Inventory shows what is in this store right now.'],
    ],
    fallback: 'Have a look around. The Help button in the top bar explains whichever screen you open.',
  },
];

const CARD_WIDTH = 330;
const GAP = 14;

export default function WelcomeTour() {
  const { can } = usePermission();
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);

  const onPhone = typeof window !== 'undefined' && window.innerWidth <= 768;

  /** The steps this person can actually be shown, right now, on this screen. */
  const steps = React.useMemo(() => STEPS.filter(step => {
    if (step.permission && !can(step.permission)) return false;
    const selector = (onPhone && step.phoneTarget) || step.target;
    if (!selector) return true;
    const el = document.querySelector(selector);
    return !!el && el.getBoundingClientRect().width > 0;
  }), [can, onPhone, running]);   // eslint-disable-line react-hooks/exhaustive-deps

  const step = steps[index];

  const remember = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private window */ }
    // Told to the account so it does not come back on another device. A failure here is not
    // worth a word to the person: the browser above already stops it coming back today.
    api.post('/auth/tour-seen').catch(() => {});
  }, []);

  const stop = useCallback(() => { setRunning(false); setIndex(0); remember(); }, [remember]);

  // New people only: the account has never been shown it, and this browser has not either.
  useEffect(() => {
    if (!user) return;
    const seenHere = (() => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } })();
    if (seenHere || user.tourSeenAt) return;
    // Let the screen finish drawing, so the things it points at are there to point at.
    const t = setTimeout(() => setRunning(true), 900);
    return () => clearTimeout(t);
  }, [user]);

  // "Show me around again", from Help & Support.
  useEffect(() => {
    const again = () => { setIndex(0); setRunning(true); };
    window.addEventListener(START_TOUR_EVENT, again);
    return () => window.removeEventListener(START_TOUR_EVENT, again);
  }, []);

  // Where the thing being talked about is, kept right through scrolling and resizing.
  useLayoutEffect(() => {
    if (!running || !step) return;
    const selector = (onPhone && step.phoneTarget) || step.target;
    const measure = () => {
      if (!selector) { setRect(null); return; }
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [running, step, index, onPhone]);

  useEffect(() => { if (running) cardRef.current?.focus(); }, [running, index]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); stop(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => Math.min(i + 1, steps.length - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, steps.length, stop]);

  if (!running || !step) return null;

  const last = index === steps.length - 1;
  const text = step.byPermission
    ? (step.byPermission.find(([p]) => can(p))?.[1] ?? step.fallback)
    : step.text;

  // The card sits under the thing it talks about, or above it when there is no room below.
  const place = () => {
    if (!rect) return { left: Math.max(16, (window.innerWidth - CARD_WIDTH) / 2), top: Math.max(80, window.innerHeight / 2 - 120) };
    const below = rect.bottom + GAP;
    const roomBelow = window.innerHeight - below > 200;
    const top = roomBelow ? below : Math.max(16, rect.top - 200 - GAP);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - CARD_WIDTH - 16);
    return { left, top };
  };
  const pos = place();

  return createPortal(
    // Clicking anywhere outside the card closes the tour. Swallowing those clicks instead would
    // leave somebody pressing the screen with nothing happening, which reads as the app hanging.
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }} aria-live="polite" onClick={stop}>
      {/* The dark sheet, with a hole cut around what is being pointed at. */}
      {rect ? (
        <div style={{
          position: 'fixed', left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12,
          borderRadius: 12, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)', border: '2px solid var(--accent-primary, #164B1E)',
          pointerEvents: 'none', transition: 'all .18s ease'
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)' }} />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}   // pressing the card itself is not "outside"
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{
          position: 'fixed', left: pos.left, top: pos.top, width: CARD_WIDTH, maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-card, #fff)', color: 'var(--text-primary)', borderRadius: 14, padding: 18,
          boxShadow: '0 18px 40px rgba(0,0,0,.28)', outline: 'none', display: 'grid', gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <Compass size={15} /> {index + 1} of {steps.length}
          </span>
          <button type="button" onClick={stop} aria-label="Close the tour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{step.title}</h3>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary, #52525b)' }}>{text}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={stop}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '6px 2px' }}>
            {last ? 'Close' : 'Skip'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setIndex(i => i - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => (last ? stop() : setIndex(i => i + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
              {last ? 'Start using ScaleEzy' : <>Next <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
