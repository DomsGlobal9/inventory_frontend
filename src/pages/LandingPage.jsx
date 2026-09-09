import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';

/**
 * The page a shopkeeper meets before they have an account.
 *
 * Laid out the way a modern product page is: one enormous sentence, then one idea per screen,
 * each with a picture of the thing it describes. The pictures are inline SVG rather than
 * screenshots or video -- they load instantly, they follow the light/dark theme, they cannot
 * arrive broken on a slow connection in a shop, and they can show the ONE thing that section is
 * about instead of a whole cluttered screen.
 *
 * Every figure drawn below is one this product actually produces. A landing page that invents
 * its numbers teaches the reader to distrust the ones inside the app.
 */

/* ─── The illustrations ──────────────────────────────────────────────────── */

/**
 * Fragments of the real product, floating in front of one another.
 *
 * Built from elements rather than SVG or screenshots: the shadows are real shadows, the text
 * stays sharp at any size, and every colour comes from the same tokens as the app, so these
 * follow the light and dark themes instead of being two pictures that have to be kept in step.
 *
 * Everything sizes in `cqw` -- one percent of the frame's own width -- so a card that overlaps
 * another at full width still overlaps it on a phone. Percentages of the container, not of the
 * screen, is what keeps a stacked composition from falling apart.
 *
 * Every name, place and figure below is invented. This page is public, and what a shop is
 * holding or paying is not ours to put on a marketing site.
 */

/** The canvas each composition floats inside. */
function Frame({ children, label }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: 'relative', width: '100%', aspectRatio: '520 / 360',
        containerType: 'inline-size',
        borderRadius: '24px', overflow: 'hidden',
        background: 'radial-gradient(120% 100% at 78% 0%, color-mix(in srgb, var(--brand) 12%, transparent) 0%, transparent 62%), var(--bg-input)',
        border: '1px solid var(--border-light)'
      }}
    >
      {children}
    </div>
  );
}

/** A floating card. `lift` is how far off the page it should read. */
const floater = (pos, lift = 2) => ({
  position: 'absolute',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-light)',
  borderRadius: '3.4cqw',
  boxShadow: lift === 1
    ? '0 1.5cqw 3cqw -1cqw rgba(0,0,0,0.18)'
    : '0 4cqw 8cqw -2cqw rgba(0,0,0,0.34), 0 0.4cqw 1.4cqw rgba(0,0,0,0.10)',
  ...pos
});

const muted = { color: 'var(--text-muted)' };
const secondary = { color: 'var(--text-secondary)' };

/** Stock moving, with the running balance lifting off the card. */
function LedgerArt() {
  const rows = [
    { what: 'Received from supplier', d: '+40', up: true },
    { what: 'Sold at the counter', d: '−6', up: false },
    { what: 'Moved to the warehouse', d: '−12', up: false }
  ];
  return (
    <Frame label="Stock movements listed on a card, with the running balance floating in front of it">
      <div style={floater({ left: '6%', top: '10%', width: '74%', padding: '4cqw 4.4cqw' }, 1)}>
        <div style={{ ...muted, fontSize: '2.1cqw', letterSpacing: '0.16em', marginBottom: '3cqw' }}>WHAT HAPPENED</div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '2.6cqw',
            padding: '2.4cqw 0', borderTop: i ? '1px solid var(--border-light)' : 'none'
          }}>
            <span style={{
              width: '1.8cqw', height: '1.8cqw', borderRadius: '50%', flexShrink: 0,
              background: r.up ? 'var(--accent-success, #10b981)' : 'var(--accent-danger, #ef4444)'
            }} />
            <span style={{ fontSize: '2.7cqw', color: 'var(--text-primary)', flex: 1 }}>{r.what}</span>
            <span style={{
              fontSize: '2.5cqw', fontWeight: 700, padding: '0.8cqw 2cqw', borderRadius: '99px',
              color: r.up ? 'var(--accent-success, #10b981)' : 'var(--accent-danger, #ef4444)',
              background: r.up ? 'color-mix(in srgb, var(--accent-success, #10b981) 16%, transparent)'
                : 'color-mix(in srgb, var(--accent-danger, #ef4444) 16%, transparent)'
            }}>{r.d}</span>
          </div>
        ))}
      </div>

      <div style={floater({ right: '5%', bottom: '11%', width: '44%', padding: '3.4cqw 4cqw' })}>
        <div style={{ ...muted, fontSize: '2.1cqw', letterSpacing: '0.16em' }}>ON HAND NOW</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.6cqw', marginTop: '1cqw' }}>
          <span style={{ fontSize: '7.4cqw', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>24</span>
          <span style={{ ...secondary, fontSize: '2.5cqw' }}>pieces</span>
        </div>
        <div style={{ ...muted, fontSize: '2.2cqw', marginTop: '1.4cqw' }}>every change kept, none overwritten</div>
      </div>
    </Frame>
  );
}

/** The value, with the sentence that qualifies it floating on top. */
function ValuationArt() {
  return (
    <Frame label="A stock value with a note floating in front saying how much of it is estimated">
      <div style={floater({ left: '7%', top: '13%', width: '62%', padding: '4.4cqw' }, 1)}>
        <div style={{ ...muted, fontSize: '2.1cqw', letterSpacing: '0.16em' }}>STOCK ON HAND</div>
        <div style={{ fontSize: '9cqw', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, margin: '1.4cqw 0' }}>₹8.4L</div>
        <div style={{ display: 'flex', height: '2.2cqw', borderRadius: '99px', overflow: 'hidden', marginTop: '3cqw' }}>
          <span style={{ flex: 68, background: 'var(--accent-success, #10b981)' }} />
          <span style={{ flex: 32, background: 'var(--accent-warning, #f59e0b)' }} />
        </div>
        <div style={{ display: 'flex', gap: '4cqw', marginTop: '2.4cqw', fontSize: '2.2cqw', ...secondary }}>
          <span>68% costed</span><span>32% estimated</span>
        </div>
      </div>

      <div style={floater({ right: '4%', bottom: '10%', width: '58%', padding: '3.4cqw 3.8cqw' })}>
        <div style={{ display: 'flex', gap: '2.4cqw', alignItems: 'flex-start' }}>
          <span style={{
            width: '4.6cqw', height: '4.6cqw', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--accent-warning, #f59e0b) 22%, transparent)',
            color: 'var(--accent-warning, #f59e0b)', fontSize: '2.8cqw', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>!</span>
          <span style={{ fontSize: '2.4cqw', lineHeight: 1.5, color: 'var(--text-primary)' }}>
            46 pieces are counted at their selling price — no cost recorded yet.
          </span>
        </div>
      </div>
    </Frame>
  );
}

/** What you keep on a piece, with the calculator floating over it. */
function MarginArt() {
  return (
    <Frame label="A price split into cost and profit, with a margin badge floating over it">
      <div style={floater({ left: '6%', top: '12%', width: '70%', padding: '4.2cqw' }, 1)}>
        <div style={{ ...muted, fontSize: '2.1cqw', letterSpacing: '0.16em', marginBottom: '3cqw' }}>ONE PIECE</div>
        <div style={{ display: 'flex', gap: '1.4cqw', alignItems: 'stretch' }}>
          <div style={{ flex: 62, background: 'var(--bg-input)', borderRadius: '2.4cqw', padding: '2.6cqw 3cqw' }}>
            <div style={{ ...muted, fontSize: '2cqw' }}>YOU PAY</div>
            <div style={{ fontSize: '4.4cqw', fontWeight: 700, color: 'var(--text-primary)' }}>₹2,600</div>
          </div>
          <div style={{
            flex: 38, borderRadius: '2.4cqw', padding: '2.6cqw 3cqw',
            background: 'color-mix(in srgb, var(--accent-success, #10b981) 18%, transparent)'
          }}>
            <div style={{ ...muted, fontSize: '2cqw' }}>YOU KEEP</div>
            <div style={{ fontSize: '4.4cqw', fontWeight: 700, color: 'var(--accent-success, #10b981)' }}>₹1,600</div>
          </div>
        </div>
        <div style={{ ...secondary, fontSize: '2.4cqw', marginTop: '2.8cqw' }}>sells for ₹4,200</div>
      </div>

      <div style={floater({ right: '6%', top: '6%', width: '30%', padding: '3cqw' })}>
        <div style={{ ...muted, fontSize: '2cqw', letterSpacing: '0.14em' }}>MARGIN</div>
        <div style={{ fontSize: '6cqw', fontWeight: 700, color: 'var(--accent-success, #10b981)', lineHeight: 1.15 }}>38.1%</div>
      </div>

      <div style={floater({ left: '13%', bottom: '8%', width: '72%', padding: '3cqw 3.4cqw' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
          <span style={{
            fontSize: '2.6cqw', fontWeight: 700, color: 'var(--text-primary)',
            border: '1.5px solid var(--brand-ink)', borderRadius: '1.8cqw', padding: '1.2cqw 2.4cqw'
          }}>60 %</span>
          <span style={{ ...muted, fontSize: '3cqw' }}>→</span>
          <span style={{ fontSize: '3.6cqw', fontWeight: 700, color: 'var(--text-primary)' }}>₹4,160</span>
          <span style={{ ...muted, fontSize: '2.3cqw' }}>price fills itself in</span>
        </div>
      </div>
    </Frame>
  );
}

/** The order, with the warning and the send button lifted off it. */
function PurchaseArt() {
  return (
    <Frame label="A draft purchase order with a warning card and a send button floating in front">
      <div style={floater({ left: '8%', top: '9%', width: '68%', padding: '4cqw 4.4cqw' }, 1)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
          <span style={{ fontSize: '3.4cqw', fontWeight: 700, color: 'var(--text-primary)' }}>Purchase order</span>
          <span style={{
            fontSize: '1.9cqw', fontWeight: 700, letterSpacing: '0.08em', padding: '0.7cqw 1.8cqw',
            borderRadius: '99px', color: 'var(--brand-ink)',
            background: 'color-mix(in srgb, var(--brand) 18%, transparent)'
          }}>DRAFT</span>
        </div>
        <div style={{ ...muted, fontSize: '2.2cqw', marginTop: '1cqw' }}>to your supplier</div>
        <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '3cqw', paddingTop: '3cqw', display: 'flex', gap: '3cqw' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '2.7cqw', color: 'var(--text-primary)' }}>Silk saree</div>
            <div style={{ ...muted, fontSize: '2.1cqw', marginTop: '0.6cqw' }}>12 pieces</div>
          </div>
          <div>
            <div style={{ ...muted, fontSize: '1.9cqw' }}>YOU PAY</div>
            <div style={{ fontSize: '2.9cqw', fontWeight: 700, color: 'var(--text-primary)' }}>₹4,050</div>
          </div>
          <div>
            <div style={{ ...muted, fontSize: '1.9cqw' }}>SELLS AT</div>
            <div style={{ fontSize: '2.9cqw', fontWeight: 700, color: 'var(--text-primary)' }}>₹4,200</div>
          </div>
        </div>
      </div>

      <div style={floater({ right: '4%', top: '46%', width: '60%', padding: '3cqw 3.4cqw' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
          <span style={{
            width: '4.4cqw', height: '4.4cqw', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--accent-danger, #ef4444) 20%, transparent)',
            color: 'var(--accent-danger, #ef4444)', fontSize: '2.7cqw', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>!</span>
          <span style={{ fontSize: '2.5cqw', fontWeight: 600, color: 'var(--accent-danger, #ef4444)' }}>
            Only ₹150 a piece at this price
          </span>
        </div>
      </div>

      <div style={floater({ left: '10%', bottom: '7%', width: '46%', padding: '0' })}>
        <div style={{
          background: 'var(--text-primary)', color: 'var(--bg-card)', borderRadius: '3.3cqw',
          padding: '2.8cqw', textAlign: 'center', fontSize: '2.6cqw', fontWeight: 700
        }}>
          Email it to them
        </div>
      </div>
    </Frame>
  );
}

/** Two places, and the total that covers both, floating across them. */
function LocationsArt() {
  const place = (label, qty) => (
    <div style={{ padding: '3.4cqw 3.8cqw' }}>
      <div style={{
        width: '7cqw', height: '7cqw', borderRadius: '2cqw', marginBottom: '2.4cqw',
        background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '3.4cqw' }}>{label === 'Your shop' ? '🏬' : '📦'}</span>
      </div>
      <div style={{ fontSize: '6cqw', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{qty}</div>
      <div style={{ ...muted, fontSize: '2.2cqw', marginTop: '0.8cqw' }}>pieces</div>
      <div style={{ ...secondary, fontSize: '2.4cqw', marginTop: '1.8cqw' }}>{label}</div>
    </div>
  );
  return (
    <Frame label="Two places holding stock, with the combined total floating across them">
      <div style={floater({ left: '5%', top: '8%', width: '40%' }, 1)}>{place('Your shop', '86')}</div>
      <div style={floater({ right: '5%', top: '8%', width: '40%' }, 1)}>{place('Your warehouse', '54')}</div>

      {/* stock crossing between them */}
      <div style={{
        position: 'absolute', left: '45%', right: '45%', top: '26%', height: '2px',
        background: 'repeating-linear-gradient(90deg, var(--brand) 0 4px, transparent 4px 9px)',
        opacity: 0.85
      }} />

      <div style={floater({ left: '14%', bottom: '9%', width: '72%', padding: '3.6cqw 4cqw' })}>
        <div style={{ ...muted, fontSize: '2cqw', letterSpacing: '0.16em' }}>EVERYWHERE YOU KEEP STOCK</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4cqw', marginTop: '1.4cqw' }}>
          <span style={{ fontSize: '5.4cqw', fontWeight: 700, color: 'var(--text-primary)' }}>140</span>
          <span style={{ ...muted, fontSize: '2.3cqw' }}>pieces</span>
          <span style={{ fontSize: '5.4cqw', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '2cqw' }}>₹8.4L</span>
          <span style={{ ...muted, fontSize: '2.3cqw' }}>worth</span>
        </div>
      </div>
    </Frame>
  );
}

/** A phone, with the scan and the result floating off it. */
function TryOnArt() {
  return (
    <Frame label="A phone showing a garment tried on, with the scanned tag floating beside it">
      {/* the phone */}
      <div style={{
        position: 'absolute', left: '50%', top: '7%', transform: 'translateX(-50%)',
        width: '31%', aspectRatio: '9 / 17', borderRadius: '5cqw',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        boxShadow: '0 5cqw 10cqw -2cqw rgba(0,0,0,0.4)', overflow: 'hidden'
      }}>
        <div style={{ height: '4%', display: 'flex', justifyContent: 'center', paddingTop: '1.4cqw' }}>
          <span style={{ width: '34%', height: '1cqw', borderRadius: '99px', background: 'var(--border-light)' }} />
        </div>
        {/* the piece, on the person -- see the note above TryOnArt */}
        <svg
          viewBox="0 0 100 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
          style={{ position: 'absolute', inset: '9% 0 0', width: '100%', height: '91%' }}
        >
          <defs>
            <linearGradient id="tryOnRoom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.20" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="tryOnDrape" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="tryOnScan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            {/* Everything is clipped to the body, so the light travels over the garment
                rather than across the whole screen. */}
            <clipPath id="tryOnBody">
              <path d="M50 26 c9 0 15 5 19 9 l10 9 c4 4 5 8 4 13 l-5 20 -3 -6 -2 103 h-46 l-2 -103 -3 6 -5 -20 c-1 -5 0 -9 4 -13 l10 -9 c4 -4 10 -9 19 -9 z" />
            </clipPath>
          </defs>

          <rect width="100" height="190" fill="url(#tryOnRoom)" />

          {/* head and neck */}
          <circle cx="50" cy="16" r="10" fill="var(--brand)" fillOpacity="0.85" />
          <rect x="45" y="24" width="10" height="7" fill="var(--brand)" fillOpacity="0.7" />

          {/* the garment on the body */}
          <g clipPath="url(#tryOnBody)">
            <rect width="100" height="190" fill="url(#tryOnDrape)" />
            {/* the pallu, falling over one shoulder -- what makes it a saree and not a tube */}
            <path d="M62 26 c14 8 20 24 17 44 -3 20 -10 40 -8 66 l-16 0 c-3 -28 3 -50 5 -68 2 -18 0 -31 -8 -40 z"
              fill="#ffffff" fillOpacity="0.22" />
            <path d="M30 96 q20 8 40 0" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.4" fill="none" />
            <path d="M30 112 q20 8 40 0" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.4" fill="none" />

            {/* the scan still passing over it */}
            <rect className="lpScan" width="100" height="34" y="-34" fill="url(#tryOnScan)" />
          </g>
        </svg>

        {/* what it is doing, said on the screen itself */}
        <div style={{
          position: 'absolute', left: '8%', right: '8%', bottom: '5%',
          display: 'flex', alignItems: 'center', gap: '1.4cqw',
          padding: '1.6cqw 2cqw', borderRadius: '2cqw',
          background: 'color-mix(in srgb, var(--bg-card) 82%, transparent)',
          border: '1px solid var(--border-light)'
        }}>
          <span className="lpPulse" style={{
            width: '1.6cqw', height: '1.6cqw', borderRadius: '50%',
            background: 'var(--brand)', flexShrink: 0
          }} />
          <span style={{ fontSize: '1.9cqw', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Trying it on&hellip;
          </span>
        </div>
      </div>

      {/* the tag, floating in front */}
      <div style={floater({ left: '4%', top: '18%', width: '30%', padding: '3cqw' })}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.9cqw' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} style={{
              aspectRatio: '1', borderRadius: '0.6cqw',
              background: 'var(--text-primary)',
              opacity: [0, 3, 5, 6, 9, 10, 12, 15].includes(i) ? 0.88 : 0.16
            }} />
          ))}
        </div>
        <div style={{ ...muted, fontSize: '2cqw', marginTop: '2.2cqw', textAlign: 'center' }}>on the tag</div>
      </div>

      {/* the promise, floating in front on the other side */}
      <div style={floater({ right: '4%', bottom: '14%', width: '38%', padding: '3.2cqw 3.6cqw' })}>
        <div style={{ fontSize: '2.9cqw', fontWeight: 700, color: 'var(--text-primary)' }}>See it on you</div>
        <div style={{ ...secondary, fontSize: '2.3cqw', marginTop: '1.2cqw', lineHeight: 1.5 }}>
          No app. No account. About a minute.
        </div>
      </div>
    </Frame>
  );
}

/** Several businesses, fanned out, each sealed from the next. */
function PlatformArt() {
  return (
    <Frame label="Several separate businesses on one platform, each sealed from the others">
      {[0, 1, 2].map(i => (
        <div key={i} style={floater({
          left: `${9 + i * 7}%`, top: `${11 + i * 9}%`, width: '56%', padding: '3.4cqw 3.8cqw',
          transform: `rotate(${-3 + i * 3}deg)`, zIndex: i
        }, i === 2 ? 2 : 1)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
            <span style={{
              width: '5.4cqw', height: '5.4cqw', borderRadius: '1.8cqw', flexShrink: 0,
              background: `color-mix(in srgb, var(--brand) ${22 + i * 16}%, transparent)`
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '1.8cqw', width: `${52 + i * 12}%`, borderRadius: '99px', background: 'var(--border-light)' }} />
              <div style={{ height: '1.5cqw', width: `${30 + i * 8}%`, borderRadius: '99px', background: 'var(--border-light)', marginTop: '1.4cqw', opacity: 0.7 }} />
            </div>
            <span style={{ ...muted, fontSize: '2.3cqw' }}>a business</span>
          </div>
        </div>
      ))}

      <div style={floater({ right: '5%', bottom: '10%', width: '48%', padding: '3.2cqw 3.6cqw' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
          <span style={{
            width: '5cqw', height: '5cqw', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6cqw'
          }}>🔒</span>
          <span style={{ fontSize: '2.4cqw', lineHeight: 1.45, color: 'var(--text-primary)' }}>
            None of them can reach another&apos;s stock, prices or customers.
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ─── The page ───────────────────────────────────────────────────────────── */

/**
 * The five things the product answers, fanned across the hero.
 *
 * Illustrative figures, not anyone's. A public page has no business carrying a real shop's
 * stock value, and the first draft of this one did.
 */
const HERO_CARDS = [
  { label: 'ON HAND',    value: '1,284', note: 'pieces, counted', tone: 'plain', rot: -3.5, dy: 14 },
  { label: 'WORTH',      value: '₹8.4L', note: 'and it says how it knows', tone: 'plain', rot: -1.5, dy: 4 },
  { label: 'MARGIN',     value: '38.1%', note: 'on every piece', tone: 'good', rot: 0, dy: -6 },
  { label: 'THIS ORDER', value: '₹150', note: 'a piece — too thin', tone: 'bad', rot: 1.8, dy: 4 },
  { label: 'TRY-ONS',    value: '312', note: 'from the tag, this month', tone: 'plain', rot: 3.5, dy: 15 }
];


/**
 * The one thing on this page a visitor can use rather than read.
 *
 * It runs the product's real rule, not a friendly approximation: the same thresholds the
 * variant table and the purchase order screen use, including the one that stops reporting a
 * percentage under 1% and says the money instead -- because "0% margin", rounded, looks like a
 * bug rather than a warning.
 *
 * Nothing is sent anywhere. It is arithmetic in a browser, and saying so is the point: the
 * quickest way to show that a tool is honest about numbers is to let someone try to catch it
 * out before they have given you an email address.
 */
function TryTheMargin() {
  const [cost, setCost] = useState('2600');
  const [price, setPrice] = useState('4200');

  const c = Number(cost) || 0;
  const p = Number(price) || 0;
  const pct = p > 0 ? ((p - c) / p) * 100 : null;
  const per = p - c;

  let verdict, tone;
  if (!p) { verdict = 'Set a price'; tone = 'muted'; }
  else if (!c) { verdict = 'No cost recorded yet'; tone = 'muted'; }
  else if (pct < 0) { verdict = `Loss ${Math.abs(pct).toFixed(1)}%`; tone = 'bad'; }
  else if (pct < 1) { verdict = `Only ₹${per.toFixed(0)} a piece`; tone = 'bad'; }
  else if (pct < 15) { verdict = `${pct.toFixed(1)}% — thin`; tone = 'bad'; }
  else if (pct < 30) { verdict = `${pct.toFixed(1)}% — workable`; tone = 'warn'; }
  else { verdict = `${pct.toFixed(1)}%`; tone = 'good'; }

  const toneColour = tone === 'good' ? 'var(--accent-success, #10b981)'
    : tone === 'warn' ? 'var(--accent-warning, #f59e0b)'
    : tone === 'bad' ? 'var(--accent-danger, #ef4444)'
    : 'var(--text-muted)';

  const field = (label, value, onChange) => (
    <label style={{ display: 'block', flex: '1 1 150px', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '12px 16px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '19px' }}>₹</span>
        <input
          type="number" inputMode="numeric" min="0" value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', minWidth: 0, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 700,
            fontFamily: 'inherit', padding: 0
          }}
        />
      </span>
    </label>
  );

  return (
    <div style={{
      borderRadius: 'clamp(20px, 3vw, 32px)', border: '1px solid var(--border-light)',
      background: 'var(--bg-card)', padding: 'clamp(24px, 4vw, 48px)',
      display: 'grid', gap: 'clamp(24px, 4vw, 56px)',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center'
    }}>
      <div>
        <p style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-ink)', margin: '0 0 14px', fontWeight: 700 }}>
          Try it here
        </p>
        <h2 style={{ fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 500, lineHeight: 1.18, letterSpacing: '-0.015em', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Put your own numbers in
        </h2>
        <p style={{ fontSize: '15.5px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: '46ch' }}>
          This is the rule the app runs, not a friendly version of it — including the part that
          stops quoting a percentage when it would round to zero and tells you the money instead.
          Nothing is sent anywhere.
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {field('You pay', cost, setCost)}
          {field('You sell at', price, setPrice)}
        </div>
        <div style={{
          marginTop: '20px', padding: '20px 24px', borderRadius: '18px',
          background: `color-mix(in srgb, ${toneColour} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${toneColour} 30%, transparent)`
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
            What the app would say
          </div>
          <div style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', fontWeight: 700, color: toneColour, lineHeight: 1.15, marginTop: '6px' }}>
            {verdict}
          </div>
          {p > 0 && c > 0 && (
            <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {per >= 0 ? 'You keep' : 'You lose'} ₹{Math.abs(per).toLocaleString('en-IN')} on every piece.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    eyebrow: 'The ledger',
    title: 'Every movement is written down, and stays written down',
    body: 'Stock in, stock out, a transfer between shops, a customer return. Each one is a line you can go back to, with who did it and when. Nothing is quietly overwritten, so the count on the screen and the count on the shelf have a reason to agree.',
    art: <LedgerArt />
  },
  {
    eyebrow: 'What it is worth',
    title: 'A number that tells you how much of itself is a guess',
    body: 'Stock you have costed is valued at what you paid. Stock you never costed is valued at what it sells for, and the screen says so plainly — because an unexplained figure is the thing to avoid, in either direction.',
    art: <ValuationArt />
  },
  {
    eyebrow: 'Cost and margin',
    title: 'Know what you make on a piece before you sell it',
    body: 'Enter what you paid and the margin appears beside the price. Type the profit you want and the price fills itself in. When a cost would leave you almost nothing, the app says so in rupees rather than in a percentage nobody reads.',
    art: <MarginArt />
  },
  {
    eyebrow: 'Buying',
    title: 'Send a purchase order without leaving the app',
    body: 'Build the order, see the margin each price would leave, then email it to the supplier or send it on WhatsApp. The order only records itself as sent once the message has actually gone.',
    art: <PurchaseArt />
  },
  {
    eyebrow: 'More than one shop',
    title: 'Each shop on its own, and the whole business at once',
    body: 'Count, price and reorder per location, then see the total that covers all of them. Move stock between shops and the numbers on both sides move with it.',
    art: <LocationsArt />
  },
  {
    eyebrow: 'Try-on',
    title: 'A customer scans the tag and sees it on themselves',
    body: 'Print a code on the garment. A shopper points their phone at it, adds a photo, and sees the piece on them — no app to install and no account to make. You pay per try-on, and you can see how many were used.',
    art: <TryOnArt />
  },
  {
    eyebrow: 'Many businesses',
    title: 'Built to run a lot of shops without mixing them up',
    body: 'Each business has its own products, prices, customers and staff, and cannot reach another’s. Everything a Scaleezy administrator does inside a shop is recorded where the shop can be told about it.',
    art: <PlatformArt />
  }
];

/**
 * What drifts around the closing panel.
 *
 * The things a clothing shop actually handles -- a garment, a spool, a price tag, a parcel, a
 * receipt, a phone. Emoji rather than illustrations: already on every device, nothing to load,
 * sharp at any size, and no asset that can go missing. Positions are percentages of the panel
 * and several sit past its edge, so it reads as depth rather than as stickers in a border.
 */
const DRIFTERS = [
  { icon: '🧵', left: '3%',  top: '16%', rot: -14, min: 26, vw: 3.4, max: 52 },
  { icon: '👗', left: '11%', top: '58%', rot: 10,  min: 30, vw: 4.0, max: 62 },
  { icon: '👜', left: '-2%', top: '76%', rot: -8,  min: 26, vw: 3.4, max: 52 },
  { icon: '🧣', left: '21%', top: '6%',  rot: 16,  min: 22, vw: 2.9, max: 44 },
  { icon: '📦', left: '4%',  top: '38%', rot: 8,   min: 24, vw: 3.1, max: 48 },
  { icon: '🏷', left: '84%', top: '12%', rot: 12,  min: 26, vw: 3.4, max: 52 },
  { icon: '📱', left: '92%', top: '44%', rot: -10, min: 26, vw: 3.4, max: 52 },
  { icon: '🧾', left: '78%', top: '72%', rot: -16, min: 24, vw: 3.1, max: 48 },
  { icon: '👠', left: '90%', top: '82%', rot: 14,  min: 26, vw: 3.4, max: 52 },
  { icon: '✂️', left: '73%', top: '30%', rot: -6, min: 20, vw: 2.6, max: 40 }
];

const FAQS = [
  {
    q: 'Do I have to enter what my stock cost?',
    a: 'No. You can add products with just a quantity and start using it today. Stock you have not costed is valued at what it sells for, and the app tells you how many units that applies to, so you always know which part of the figure is solid. Add the cost whenever you like and it will value what you are already holding.'
  },
  {
    q: 'What happens to stock I already have when I start?',
    a: 'You enter it as opening stock, with a cost if you know it. If you do not know it yet, the pieces are counted but left unvalued rather than recorded as free — and your first purchase at a real price will not be dragged down by them.'
  },
  {
    q: 'Can two of my shops share one account?',
    a: 'Yes. Add a location for each shop. Stock, prices and reorder levels are kept per location, transfers move stock between them, and the dashboard shows both the shop you are standing in and the business as a whole.'
  },
  {
    q: 'Can my staff see everything?',
    a: 'Only what you allow. Roles decide who can change prices, receive stock, see costs or manage the team, and what they do is recorded in the activity feed.'
  },
  {
    q: 'What is the try-on for?',
    a: 'A customer scans a code on the garment and sees it on themselves, from their own photo, in about a minute. It works in any phone browser with no app and no sign-up. You are charged per try-on and can see the count at any time.'
  },
  {
    q: 'Is my data separate from other businesses?',
    a: 'Yes, and it is checked rather than assumed. Every request carries the business it belongs to, and the tests that ship with this product try to reach one shop’s data from another and require it to fail.'
  }
];

export default function LandingPage() {
  // Someone already signed in has no use for the sales pitch, and being shown it is
  // indistinguishable from having been signed out. Wait for the session check first, so a
  // signed-in visitor is not flashed the marketing page on every reload.
  const { isAuthenticated, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;


  // Wider than it was. At 1120px a large monitor showed more empty margin than page, which is
  // not restraint, it is unused space.
  const shell = { maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(20px, 3vw, 40px)' };

  // Alternating left/right is a wide-screen idea. Stacked into one column it just means half
  // the sections show a picture before saying what it is a picture of, so it is switched off
  // below the point where the grid stops being two columns. An inline style cannot hold a
  // media query, hence the tag.
  const responsiveCss = `
    @media (max-width: 719px) {
      .lp-row > * { order: 0 !important; }
    }

    /* Base state is the finished state, so nothing here is required for the words to be read. */
    @keyframes lpRise {
      from { opacity: 0; transform: translateY(22px); }
      to   { opacity: 1; transform: none; }
    }
    .lp-rise   { animation: lpRise .62s cubic-bezier(.22,1,.36,1) both; }
    .lp-rise-2 { animation-delay: .10s; }
    .lp-rise-3 { animation-delay: .20s; }
    .lp-rise-4 { animation-delay: .32s; }
    @media (prefers-reduced-motion: reduce) { .lp-rise { animation: none; } }
    /* The scan travelling down the garment, and the dot that says it is still working.
       Both stop for anyone who has asked their system for less motion -- see the
       prefers-reduced-motion block below, where the figure simply sits there fully rendered. */
    @keyframes lpScanSweep {
      0%   { transform: translateY(0); }
      100% { transform: translateY(224px); }
    }
    @keyframes lpPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.45; transform: scale(0.8); }
    }
    .lpScan { animation: lpScanSweep 2.6s cubic-bezier(.4,0,.6,1) infinite; }
    .lpPulse { animation: lpPulse 1.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .lpScan { animation: none; opacity: 0; }
      .lpPulse { animation: none; }
    }

    @keyframes lpFloat {
      0%, 100% { translate: 0 0; }
      50%      { translate: 0 -10px; }
    }
    .lp-drift { animation: lpFloat 7s ease-in-out infinite; }
    /* Motion here is decoration, and decoration is the first thing to drop for anyone who has
       asked their device to stop moving things. */
    @media (prefers-reduced-motion: reduce) { .lp-drift { animation: none; } }
    /* On a narrow screen they would sit on the words instead of around them. */
    @media (max-width: 639px) { .lp-drift { display: none; } }

    /* The hero strip runs off both edges. The two outermost cards are the ones to drop as the
       screen narrows, because they are the ones already half off the screen. */
    @media (max-width: 1023px) { .lp-strip-0, .lp-strip-4 { display: none; } }
    @media (max-width: 719px)  { .lp-strip-1, .lp-strip-3 { display: none; } }
    @media (max-width: 719px)  { .lp-strip { padding-bottom: 8px; } }
    .lp-strip-card { transition: transform .35s cubic-bezier(.22,1,.36,1); }
    @media (hover: hover) {
      .lp-strip-card:hover { transform: rotate(0deg) translateY(-10px) !important; }
    }
  `;

  return (
    // Scrolls itself, not the window. The app shell gives html and body `overflow: hidden`
    // ("zero global scroll" -- index.css), so a page that expects the window to scroll simply
    // does not, and everything past the first screen is unreachable.
    <div className="lp" style={{ backgroundColor: 'var(--bg-dark)', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
      <Helmet>
        <title>Scaleezy Inventory</title>
        <meta name="description" content="Inventory for clothing retail: an immutable ledger, honest stock valuation, margins before you buy, purchase orders you can send, multi-location stock, and QR try-on for shoppers." />
        <meta name="keywords" content="inventory management, retail stock, saree shop software, purchase orders, stock valuation, virtual try on" />
        <meta property="og:title" content="Scaleezy Inventory" />
        <meta property="og:description" content="Know what you are holding, what it cost, and what it is worth." />
      </Helmet>

      <style>{responsiveCss}</style>

      {/* Navigation */}
      <nav style={{ padding: 'clamp(14px, 3vw, 20px) clamp(16px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textDecoration: 'none' }}>
            <img src="/scaleezy-logo.png" alt="Scaleezy" style={{ height: 'clamp(30px, 5vw, 40px)', objectFit: 'contain', display: 'block' }} />
            <span style={{
              fontSize: 'clamp(9px, 1.5vw, 11px)', fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              // Nudged to sit under the wordmark rather than under the mark, which is where the
              // eye expects a product name to hang.
              paddingLeft: '2px', lineHeight: 1
            }}>
              Inventory
            </span>
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/login" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>Log In</Link>
          <Link to="/signup" style={{
            whiteSpace: 'nowrap', padding: '10px 22px', borderRadius: '999px',
            fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            background: 'var(--brand-solid)', color: 'var(--brand-on-solid)'
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      {/* Full bleed on purpose. The wording is unchanged; what changed is that it no longer
          sits in a 1000px column with the rest of a wide screen left empty. The strip beneath
          runs past both edges, so the page starts by showing the product rather than only
          describing it, and a wide monitor gets more of it rather than more margin. */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingBottom: 'clamp(40px, 6vw, 76px)' }}>
        {/* light thrown from behind the headline */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: '-30% -10% auto', height: '150%', pointerEvents: 'none',
          background: `
            radial-gradient(52% 46% at 50% 34%, color-mix(in srgb, var(--brand) 22%, transparent) 0%, transparent 70%),
            radial-gradient(38% 34% at 18% 12%, color-mix(in srgb, var(--brand) 12%, transparent) 0%, transparent 70%)`
        }} />

        <div style={{ position: 'relative', padding: 'clamp(64px, 11vw, 128px) 24px clamp(36px, 5vw, 64px)', textAlign: 'center' }}>
          <div>
            <h1 className="lp-rise" style={{
              fontSize: 'clamp(40px, 8.4vw, 96px)', fontWeight: 800, marginBottom: '24px',
              lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--text-primary)'
            }}>
              Total stock control. <br />
              <span style={{ color: 'var(--brand-ink)' }}>Effortless scaling.</span>
            </h1>
            <p className="lp-rise lp-rise-2" style={{
              fontSize: 'clamp(17px, 1.9vw, 22px)', color: 'var(--text-secondary)',
              maxWidth: '62ch', margin: '0 auto 44px', lineHeight: 1.6
            }}>
              Scaleezy Inventory is the definitive operating system for modern retail. Say goodbye
              to spreadsheet chaos and hello to an immutable ledger and real-time insights.
            </p>
            <div className="lp-rise lp-rise-3" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* The brand's own green, not the app's default dark button. On the one page a
                  visitor sees before they know what Scaleezy is, the call to action should be
                  the colour of the logo above it. */}
              <Link to="/signup" style={{
                padding: '16px 38px', borderRadius: '999px', fontSize: '17px', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
                background: 'var(--brand-solid)', color: 'var(--brand-on-solid)',
                boxShadow: '0 16px 34px -12px color-mix(in srgb, var(--brand-solid) 65%, transparent)'
              }}>
                Start for free <ArrowRight size={19} />
              </Link>
              <Link to="/login" style={{
                padding: '16px 38px', borderRadius: '999px', fontSize: '17px', fontWeight: 500,
                textDecoration: 'none', color: 'var(--text-primary)',
                border: '1px solid var(--border-light)', background: 'var(--bg-card)'
              }}>
                Live Demo
              </Link>
            </div>
          </div>
        </div>

        {/* The product itself, fanned across the whole width and running off both sides so it
            reads as a shelf continuing past the screen rather than as five cards in a box. */}
        <div
          className="lp-strip lp-rise lp-rise-4"
          style={{
            display: 'flex', gap: 'clamp(12px, 1.6vw, 26px)', alignItems: 'center',
            justifyContent: 'center', padding: '0 12px', marginTop: 'clamp(8px, 2vw, 26px)'
          }}
        >
          {HERO_CARDS.map((c, i) => (
            <div key={i} className={`lp-strip-card lp-strip-${i}`} style={{
              flex: '0 0 auto', width: 'clamp(150px, 15.5vw, 236px)',
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: 'clamp(14px, 1.5vw, 22px)', padding: 'clamp(14px, 1.5vw, 22px)',
              boxShadow: '0 26px 50px -20px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.07)',
              transform: `rotate(${c.rot}deg) translateY(${c.dy}px)`
            }}>
              <div style={{ fontSize: 'clamp(8.5px, 0.78vw, 10.5px)', letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 700 }}>
                {c.label}
              </div>
              <div style={{
                fontSize: 'clamp(20px, 2.3vw, 34px)', fontWeight: 700, lineHeight: 1.15,
                margin: 'clamp(6px, 0.7vw, 10px) 0 clamp(4px, 0.5vw, 7px)',
                color: c.tone === 'good' ? 'var(--accent-success, #10b981)'
                  : c.tone === 'bad' ? 'var(--accent-danger, #ef4444)'
                  : 'var(--text-primary)'
              }}>
                {c.value}
              </div>
              <div style={{ fontSize: 'clamp(10.5px, 1vw, 13px)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {c.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features, one idea per screen ───────────────────────────────── */}
      {FEATURES.map((f, i) => (
        <React.Fragment key={i}>
        <section style={{
          padding: 'clamp(56px, 9vw, 104px) 0',
          background: i % 2 === 1 ? 'var(--bg-card)' : 'transparent',
          borderTop: '1px solid var(--border-light)'
        }}>
          <div className="lp-row" style={{
            ...shell,
            display: 'grid', gap: 'clamp(32px, 6vw, 72px)', alignItems: 'center',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
          }}>
            {/* Text first in the DOM on every row, so a phone always reads the idea before the
                picture of it. The visual order alternates on wide screens only. */}
            <motion.div
              // Fires as soon as a sliver of the section shows, not 80px after it has arrived.
              // A reveal that runs late is a blank panel to anyone scrolling at normal speed --
              // and on a landing page a blank panel reads as a broken page, not as an animation.
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.4 }}
              style={{ order: i % 2 === 1 ? 2 : 1 }}
            >
              <p style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-ink)', margin: '0 0 16px', fontWeight: 600 }}>
                {f.eyebrow}
              </p>
              <h2 style={{
                fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 500, lineHeight: 1.16,
                letterSpacing: '-0.015em', color: 'var(--text-primary)', margin: '0 0 20px'
              }}>
                {f.title}
              </h2>
              <p style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: 'var(--text-secondary)', lineHeight: 1.68, margin: 0, maxWidth: '52ch' }}>
                {f.body}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.985 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.45, delay: 0.05 }}
              style={{ order: i % 2 === 1 ? 1 : 2, minWidth: 0 }}
            >
              {f.art}
            </motion.div>
          </div>
        </section>

        {/* Halfway down, the page stops explaining and hands over. Placed after the section
            about margin because that is the moment the reader has just been told a rule and is
            in a position to test it. */}
        {i === 2 && (
          <section style={{ padding: 'clamp(48px, 7vw, 88px) 0', borderTop: '1px solid var(--border-light)' }}>
            <div style={shell}><TryTheMargin /></div>
          </section>
        )}
        </React.Fragment>
      ))}

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(56px, 9vw, 104px) 0', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ ...shell, maxWidth: '820px' }}>
          <p style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-ink)', margin: '0 0 16px', fontWeight: 600 }}>
            Frequently asked questions
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--text-primary)', margin: '0 0 40px' }}>
            The things shopkeepers ask first
          </h2>
          <div>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '20px', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', color: 'var(--text-primary)', fontSize: 'clamp(15px, 2vw, 18px)',
                      fontWeight: 500, fontFamily: 'inherit'
                    }}
                  >
                    {f.q}
                    <span style={{ flexShrink: 0, color: 'var(--text-secondary)', display: 'flex' }}>
                      {open ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                  {open && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      style={{ margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: '15.5px', lineHeight: 1.7, maxWidth: '62ch', overflow: 'hidden' }}
                    >
                      {f.a}
                    </motion.p>
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border-light)' }} />
          </div>
        </div>
      </section>

      {/* ── Closing ─────────────────────────────────────────────────────── */}
      {/* One panel, the things a clothing shop actually handles drifting around its edges.
          Emoji rather than illustrations on purpose: they are already on every device, they
          cost nothing to load, they stay sharp at any size, and there is no asset to go
          missing. Some sit half outside the panel so it reads as depth rather than as a
          border with stickers inside it. */}
      <section style={{ padding: 'clamp(40px, 6vw, 72px) 0 clamp(56px, 8vw, 96px)' }}>
        <div style={shell}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 'clamp(24px, 4vw, 40px)',
            padding: 'clamp(56px, 9vw, 116px) clamp(20px, 5vw, 64px)',
            textAlign: 'center',
            background: `
              radial-gradient(90% 120% at 15% 0%, color-mix(in srgb, var(--brand) 26%, transparent) 0%, transparent 58%),
              radial-gradient(80% 110% at 85% 100%, color-mix(in srgb, var(--brand) 18%, transparent) 0%, transparent 55%),
              var(--bg-card)`,
            border: '1px solid var(--border-light)'
          }}>
            {DRIFTERS.map((d, i) => (
              <span key={i} aria-hidden="true" className="lp-drift" style={{
                position: 'absolute', left: d.left, top: d.top,
                fontSize: `clamp(${d.min}px, ${d.vw}vw, ${d.max}px)`,
                transform: `rotate(${d.rot}deg)`,
                filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.22))',
                animationDelay: `${i * 0.45}s`,
                userSelect: 'none', pointerEvents: 'none', lineHeight: 1
              }}>{d.icon}</span>
            ))}

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '68px', height: '68px', margin: '0 auto 26px',
                borderRadius: '18px', background: 'var(--bg-dark)',
                border: '1px solid var(--border-light)',
                boxShadow: '0 14px 30px -8px rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img src="/scaleezy-logo.png" alt="" style={{ width: '44px', objectFit: 'contain' }} />
              </div>

              <p style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-ink)', fontWeight: 700, margin: '0 0 16px' }}>
                Try Scaleezy
              </p>
              <h2 style={{
                fontSize: 'clamp(26px, 4.4vw, 46px)', fontWeight: 500, lineHeight: 1.14,
                letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 auto', maxWidth: '20ch'
              }}>
                Ready to know exactly what you are holding?
              </h2>
              <p style={{ fontSize: 'clamp(15px, 1.9vw, 17px)', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '46ch', margin: '20px auto 0' }}>
                Add your products, enter what is on the shelves, and the rest follows. No card,
                and nothing to install.
              </p>
              <Link to="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: '9px', marginTop: '34px',
                padding: '15px 34px', borderRadius: '999px', fontSize: '16px', fontWeight: 700,
                background: 'var(--brand-solid)', color: 'var(--brand-on-solid)', textDecoration: 'none',
                boxShadow: '0 14px 30px -10px color-mix(in srgb, var(--brand-solid) 60%, transparent)'
              }}>
                Get started <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {/* Only links that go somewhere. A footer full of plausible headings that 404 is worse
          than a short one: it is the first promise the product breaks, and it breaks it before
          anyone has signed up. So the space goes on saying what the thing does instead of on
          columns of dead words. */}
      <footer style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 'auto -10% -60% -10%', height: '120%', pointerEvents: 'none',
          background: 'radial-gradient(50% 60% at 50% 100%, color-mix(in srgb, var(--brand) 13%, transparent) 0%, transparent 70%)'
        }} />

        <div style={{ ...shell, position: 'relative', paddingTop: 'clamp(56px, 7vw, 88px)', paddingBottom: '32px' }}>
          {/* The name, at the size a name deserves at the bottom of a page. */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px, 4vw, 56px)',
            alignItems: 'flex-end', justifyContent: 'space-between',
            paddingBottom: 'clamp(32px, 4vw, 52px)', borderBottom: '1px solid var(--border-light)'
          }}>
            <div style={{ maxWidth: '30ch' }}>
              <img src="/scaleezy-logo.png" alt="Scaleezy" style={{ height: 'clamp(30px, 3.4vw, 42px)', objectFit: 'contain', marginBottom: '18px' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'clamp(15px, 1.5vw, 17px)', lineHeight: 1.6 }}>
                Stock, costs and margins for clothing retail — counted honestly, and the same on
                every screen you open.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: '9px',
                padding: '14px 28px', borderRadius: '999px', fontSize: '15.5px', fontWeight: 700,
                background: 'var(--brand-solid)', color: 'var(--brand-on-solid)', textDecoration: 'none'
              }}>
                Create a workspace <ArrowRight size={16} />
              </Link>
              <Link to="/login" style={{
                padding: '14px 28px', borderRadius: '999px', fontSize: '15.5px', fontWeight: 500,
                color: 'var(--text-primary)', textDecoration: 'none', border: '1px solid var(--border-light)'
              }}>
                Log in
              </Link>
            </div>
          </div>

          {/* What it does, as short lines rather than as links that lead back to the same page. */}
          <div style={{
            display: 'grid', gap: 'clamp(20px, 3vw, 40px)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            padding: 'clamp(32px, 4vw, 48px) 0'
          }}>
            {[
              { k: 'Counts', v: 'A ledger nothing overwrites' },
              { k: 'Values', v: 'And says how much is a guess' },
              { k: 'Buys', v: 'Orders you can actually send' },
              { k: 'Spans', v: 'Every shop you keep stock in' },
              { k: 'Sells', v: 'Try-on straight from the tag' }
            ].map((c, i) => (
              <div key={i}>
                <div style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-ink)', fontWeight: 700, marginBottom: '10px' }}>
                  {c.k}
                </div>
                <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            paddingTop: '24px', borderTop: '1px solid var(--border-light)',
            display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              © {new Date().getFullYear()} Scaleezy Inventory
            </p>
            <a href="mailto:inventory.scaleezy@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13.5px' }}>
              inventory.scaleezy@gmail.com
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
