import { useEffect, useRef } from 'react';

/**
 * Publishes how much of a horizontally scrolling table you can actually see.
 *
 * A row that spans every column -- an expanded detail panel, a centred "nothing here"
 * message -- is as wide as the TABLE, not as wide as the screen. On a phone the variants
 * table is 1483px across inside a 344px window, so the supplier panel's buttons sat 1,325px
 * to the right: present, reachable only by dragging the table sideways for a second or two,
 * and invisible until you did. Centred empty-state text has the same problem and is worse,
 * because it is centred on 740px and nothing hints that it is there at all.
 *
 * Attach the returned ref to the scrolling container. It writes its own visible width to
 * --fullrow-w, which the .fullrow-content class in index.css uses to size a sticky wrapper.
 * Measured rather than guessed: the visible width is the container's, not the viewport's,
 * and the gap between them (sidebar, padding, card chrome) changes with the breakpoint.
 */
export function useVisibleRowWidth() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => el.style.setProperty('--fullrow-w', `${el.clientWidth}px`);
    apply();

    // ResizeObserver catches the cases a window resize listener misses entirely: the
    // sidebar opening, a panel expanding, the container changing size while the window
    // stays put. The listener is the fallback for browsers without it.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply);
      return () => window.removeEventListener('resize', apply);
    }

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return ref;
}
