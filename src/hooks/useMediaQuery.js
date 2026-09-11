import { useEffect, useState } from 'react';

/**
 * Does the screen currently match this media query?
 *
 * For the cases where a layout has to be genuinely different rather than merely narrower --
 * a data table that becomes a stack of cards, say. CSS handles most responsiveness on its
 * own and should keep doing so; this is for when the right answer is different MARKUP, not
 * different widths, and rendering both and hiding one would put two copies of every input
 * on the page.
 *
 * Reactive, because the answer changes when a phone is turned on its side.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);

    // addListener is the form Safari understood until 14, which is still inside the range
    // of phones walking into shops.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);

  return matches;
}
