import { useEffect, useState } from 'react';

/**
 * The little pixel characters on the landing page (Piixpal, MIT, files in public/piixpal).
 *
 * Self-hosted and only these few: each character is a 1-4 KB script that loads the shared engine
 * (public/piixpal/core.min.js) from beside itself, so nothing comes from anyone else's server and
 * the app's own screens never load any of it. The library keeps them still for people who ask
 * their device for less motion, and never lets them block a click.
 */
const PALS = ['bitbug', 'plane', 'scout', 'scrolly', 'para', 'lurk', 'kitty', 'pip'];

export function usePixelPals(names = PALS) {
  // Ready once every character THIS page asks for has loaded (another page may have loaded others).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return undefined;
    let left = names.length;
    const added = [];
    for (const name of names) {
      const src = `/piixpal/c/${name}.min.js`;
      if (document.querySelector(`script[src="${src}"]`)) { if (--left === 0) setReady(true); continue; }
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = s.onerror = () => { if (--left === 0) setReady(true); };
      document.head.appendChild(s);
      added.push(s);
    }
    return undefined;
  }, [ready]);
  return ready;
}

/**
 * Our own spotlight for Scout's tour: rounded, with room around each stop and a thin lime ring.
 *
 * The library dims the page with a sheet that has a hard rectangle cut exactly to the element's edges, so
 * text sat right on the border of a square box. Its sheet (inside the library's shadow root) is kept but
 * made clear, and this one is drawn just under the characters' layer, so Scout and its bubble stay on top.
 * Follows the stop while the page scrolls; gone when the tour ends.
 */
export function useTourSpotlight(ready) {
  useEffect(() => {
    if (!ready) return undefined;
    let target = null, raf = 0, spot = null, sheet = null;
    const PAD = 18;
    // The library's sheet: the element whose clip-path cuts the hole. It sets its own dimming again, so it is
    // cleared on every frame of the tour, not once.
    // It lives inside the library's own shadow root, so the search goes into shadow roots too. Returns the
    // sheet and the page-level element that hosts it (the layer), whose stacking ours goes just under.
    const findSheet = () => {
      const walk = (root, host) => {
        for (const el of root.querySelectorAll('*')) {
          if (String(el.style?.clipPath || '').startsWith('polygon(evenodd')) return { el, host };
          if (el.shadowRoot) { const hit = walk(el.shadowRoot, host || el); if (hit) return hit; }
        }
        return null;
      };
      return walk(document, null);
    };
    const place = () => {
      if (!spot || !target) return;
      if (!sheet || !sheet.el.isConnected) sheet = findSheet();
      if (sheet && sheet.el.style.background !== 'transparent') sheet.el.style.background = 'transparent';
      const r = target.getBoundingClientRect();
      Object.assign(spot.style, { left: `${r.left - PAD}px`, top: `${r.top - PAD}px`, width: `${r.width + PAD * 2}px`, height: `${r.height + PAD * 2}px` });
      raf = requestAnimationFrame(place);
    };
    const onStep = (e) => {
      target = e.detail?.target ?? null;
      if (!target) return;
      // Ours sits in the page just under the characters' layer, so Scout and its bubble stay on top of it.
      sheet = findSheet();
      if (!spot) {
        spot = document.createElement('div');
        spot.setAttribute('aria-hidden', 'true');
        spot.className = 'lp-spotlight';
        const z = parseInt(sheet?.host ? getComputedStyle(sheet.host).zIndex : '', 10);
        spot.style.zIndex = String(Number.isFinite(z) ? z - 1 : 39);
        document.body.appendChild(spot);
      }
      cancelAnimationFrame(raf); place();
    };
    const onEnd = () => { cancelAnimationFrame(raf); target = null; spot?.remove(); spot = null; };
    document.addEventListener('piix:tour-step', onStep);
    document.addEventListener('piix:tour-end', onEnd);
    return () => { document.removeEventListener('piix:tour-step', onStep); document.removeEventListener('piix:tour-end', onEnd); onEnd(); };
  }, [ready]);
}

/** Starts Scout's guided tour of the page (the "Show me around" button). */
export function startTour() {
  // The plane's banner crosses the top of the screen slowly; it would fly through the spotlight.
  document.querySelector('piix-pal[pal="plane"]')?.remove();
  const scout = document.querySelector('piix-pal[pal="scout"]');
  scout?.ctl?.start?.();
}
