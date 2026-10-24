import { useEffect, useState } from 'react';

/**
 * The little pixel characters on the public pages: the Peeper on the login box, the peeking ones on
 * What's new (Piixpal, MIT, files in public/piixpal). The landing page itself has none since 24 Oct.
 *
 * Self-hosted and only these few: each character is a 1-4 KB script that loads the shared engine
 * (public/piixpal/core.min.js) from beside itself, so nothing comes from anyone else's server and
 * the app's own screens never load any of it. The library keeps them still for people who ask
 * their device for less motion, and never lets them block a click.
 */
/** Loads the named characters, e.g. usePixelPals(['peeper']); true once they are all ready. */
export function usePixelPals(names) {
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
