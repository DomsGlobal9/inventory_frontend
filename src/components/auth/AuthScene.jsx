import React, { useMemo } from 'react';
import { buildScene, CRATE_TRAVEL, VIEWBOX } from './inventoryScene';

/**
 * The scene beside the sign-in form: a delivery arrives, goes onto the rack, the count goes up, one
 * colour runs low and is reordered -- what Inventory does, in one slow loop, with a caption that says
 * each step in words so the motion means something.
 *
 * Motion is CSS only (no timers): it pauses by itself in a background tab, only transform and opacity
 * move, and with reduced motion the finished scene is shown still. The drawing is in inventoryScene.js.
 */
const STEPS = [
  '12 pieces arrive from your supplier',
  'Put away on rack C2',
  '48 in hand, every movement kept',
  'One colour runs low, and a reorder goes out'
];

const CSS = `
.auth-scene {
  --sc-top:#FFFFFF; --sc-left:#EDF2E8; --sc-right:#DCE5D4; --sc-line:#2C4A31; --sc-line-soft:rgba(44,74,49,.55);
  --sc-shadow:rgba(22,75,30,.16); --sc-brand:#A6D92B; --sc-brand-deep:#1F5A28; --sc-brand-deep-l:#164B1E; --sc-brand-deep-r:#103A16;
  --sc-glass:#CFE3F0; --sc-ink:#2C4A31; --sc-wood:#F4EBDD; --sc-wood-l:#E6D7BF; --sc-wood-r:#D6C3A4;
  --sc-silk-1:#B8336A; --sc-silk-2:#E3A21A; --sc-silk-3:#2F8F6B; --sc-zari:#F2D27A; --sc-fold:rgba(255,255,255,.55);
  --sc-screen:#0F2A14; --sc-lime:#A6D92B; --sc-lime-l:#8FC21F; --sc-lime-r:#79A818; --sc-warn:#F2B53A;
  --sc-print:#164B1E;
  margin: 28px 0 0; max-width: 560px;
}
html[data-theme='dark'] .auth-scene {
  --sc-top:#22322A; --sc-left:#1A271F; --sc-right:#132019; --sc-line:#8FB08C; --sc-line-soft:rgba(143,176,140,.5);
  --sc-shadow:rgba(0,0,0,.45); --sc-glass:#5E7F92; --sc-ink:#0E1712; --sc-wood:#3B3326; --sc-wood-l:#2F291E; --sc-wood-r:#251F17;
  --sc-print:#A6D92B;
}
.auth-scene svg { display:block; width:100%; height:auto; overflow:visible; }
.auth-scene .sc-print { font:600 9px var(--font-sans, Inter, system-ui, sans-serif); fill:var(--sc-print); letter-spacing:.12em; }
.auth-scene .sc-count { font:600 11px var(--font-sans, Inter, system-ui, sans-serif); fill:#EAF6CC; }
.auth-scene .sc-tagtext { font:600 12px var(--font-sans, Inter, system-ui, sans-serif); fill:#3A2400; }

/* One 10s story: arrive (0-25%), put away (25-50%), counted (50-75%), runs low (75-100%). */
/* The crate waits at the truck while the caption says it arrived, then glides over evenly. */
.auth-scene .sc-crate { animation: sc-crate 10s cubic-bezier(.65,0,.35,1) infinite; }
.auth-scene .sc-new { animation: sc-new 10s cubic-bezier(.16,1,.3,1) infinite; }
.auth-scene .sc-bar-grow { transform-box: fill-box; transform-origin: 50% 100%; animation: sc-bar 10s cubic-bezier(.16,1,.3,1) infinite; }
.auth-scene .sc-count-a { animation: sc-count-a 10s linear infinite; }
.auth-scene .sc-count-b { animation: sc-count-b 10s linear infinite; }
.auth-scene .sc-low { animation: sc-low 10s cubic-bezier(.16,1,.3,1) infinite; }
.auth-scene .sc-tag { animation: sc-tag 10s cubic-bezier(.16,1,.3,1) infinite; }
@keyframes sc-crate {
  0% { opacity:0; transform:translate(0,0); } 3%, 16% { opacity:1; transform:translate(0,0); }
  29% { opacity:1; transform:translate(var(--sc-dx),var(--sc-dy)); } 32%, 100% { opacity:0; transform:translate(var(--sc-dx),var(--sc-dy)); }
}
@keyframes sc-new { 0%, 28% { opacity:0; transform:translateY(-10px); } 34%, 94% { opacity:1; transform:translateY(0); } 99%, 100% { opacity:0; transform:translateY(0); } }
@keyframes sc-bar { 0%, 50% { transform:scaleY(.7); } 58%, 96% { transform:scaleY(1); } 100% { transform:scaleY(.7); } }
@keyframes sc-count-a { 0%, 50% { opacity:1; } 52%, 98% { opacity:0; } 100% { opacity:1; } }
@keyframes sc-count-b { 0%, 50% { opacity:0; } 52%, 98% { opacity:1; } 100% { opacity:0; } }
@keyframes sc-low { 0%, 74% { transform:translateY(0); } 80%, 92% { transform:translateY(-4px); } 98%, 100% { transform:translateY(0); } }
@keyframes sc-tag { 0%, 75% { opacity:0; transform:translateY(6px); } 80%, 95% { opacity:1; transform:translateY(0); } 99%, 100% { opacity:0; transform:translateY(0); } }

.auth-scene-steps { position:relative; height:26px; margin:10px 0 0; padding:0; list-style:none; }
.auth-scene-steps li { position:absolute; inset:0 auto auto 0; display:flex; align-items:center; gap:10px; font-size:15px; color:var(--text-secondary); opacity:0; animation: sc-step 10s linear infinite; }
.auth-scene-steps li::before { content:''; width:8px; height:8px; border-radius:50%; background:var(--brand); flex:none; }
.auth-scene-steps li:nth-child(2) { animation-delay: 2.5s; }
.auth-scene-steps li:nth-child(3) { animation-delay: 5s; }
.auth-scene-steps li:nth-child(4) { animation-delay: 7.5s; }
@keyframes sc-step { 0% { opacity:0; transform:translateY(4px); } 3%, 22% { opacity:1; transform:translateY(0); } 25%, 100% { opacity:0; transform:translateY(-4px); } }
.auth-scene-still { display:none; }

@media (prefers-reduced-motion: reduce) {
  .auth-scene .sc-crate, .auth-scene .sc-count-a { animation:none; opacity:0; }
  .auth-scene .sc-new, .auth-scene .sc-count-b, .auth-scene .sc-tag { animation:none; opacity:1; transform:none; }
  .auth-scene .sc-bar-grow, .auth-scene .sc-low { animation:none; transform:none; }
  .auth-scene-steps { display:none; }
  .auth-scene-still { display:flex; align-items:center; gap:10px; margin:10px 0 0; font-size:15px; color:var(--text-secondary); }
  .auth-scene-still::before { content:''; width:8px; height:8px; border-radius:50%; background:var(--brand); }
}
`;

export default function AuthScene() {
  // Built once: it is a fixed drawing with no data in it.
  const svg = useMemo(() => buildScene(), []);
  return (
    <figure className="auth-scene" style={{ '--sc-dx': `${CRATE_TRAVEL.dx}px`, '--sc-dy': `${CRATE_TRAVEL.dy}px` }} aria-label="A delivery is received, put away on a rack, counted, and reordered when it runs low">
      <style>{CSS}</style>
      <svg viewBox={VIEWBOX} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: svg }} />
      <ol className="auth-scene-steps" aria-hidden="true">
        {STEPS.map(s => <li key={s}>{s}</li>)}
      </ol>
      <p className="auth-scene-still">Every piece received, shelved and counted</p>
    </figure>
  );
}
