import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/config';

/**
 * Instant updates (12 Nov 2026, PLAN-live.md): one line per signed-in tab to GET /api/v1/live, which says only
 * "this kind of thing changed in your shop". Each topic reloads the screens that show it, through their usual
 * requests and permissions -- so a bill made at the POS till, a customer changed in CRM, or a Shopify order shows
 * on an open page without a refresh. Only screens on show reload at once; the rest are marked old and reload when
 * opened.
 *
 * The browser reconnects a dropped line by itself; after a drop everything reloads once, because what changed
 * meanwhile was not heard. If the line cannot be opened at all (a strict network), screens refresh every minute.
 */
const DASHBOARD = [['dashboard'], ['dashboard-summary'], ['dashboard-overview']];
export const TOPIC_KEYS = {
  orders: [['sales-orders'], ['returns'], ['return'], ['counter-returns'], ['customers'], ['daybook'], ['reports'], ['store-credit'], ['loyalty'], ['logistics'], ['shelves'], ['shop-waiting'], ['pos'], ...DASHBOARD],
  returns: [['returns'], ['return'], ['counter-returns'], ['sales-orders'], ['daybook'], ['store-credit'], ['customers'], ...DASHBOARD],
  customers: [['customers'], ['customer-groups'], ['loyalty'], ['store-credit']],
  vouchers: [['gift-vouchers']],
  stock: [['inventory'], ['inventory-variants'], ['inventory-transactions'], ['transactions'], ['variants'], ['products'], ['product'], ['shelves'], ['reorder-suggestions'], ['stock-counts'], ['counter-items'], ...DASHBOARD],
  shelves: [['shelves']],
  products: [['products'], ['product'], ['variants'], ['inventory-variants'], ['catalog-items'], ['inventory'], ['images'], ['variant-suppliers'], ['supplier-products'], ['counter-items']],
  alerts: [['inventory', 'alerts'], ...DASHBOARD],
  purchases: [['purchase-orders'], ['reorder-suggestions'], ['suppliers'], ['supplier'], ['supplier-products'], ['variant-suppliers'], ...DASHBOARD],
  counts: [['stock-counts']],
  offers: [['offers']],
  settings: [['branding']]
};
const EVERYTHING = Object.keys(TOPIC_KEYS);
const FALLBACK_MS = 60_000;

export function keysFor(topics) {
  const seen = new Set();
  const out = [];
  for (const t of topics) for (const k of TOPIC_KEYS[t] ?? []) {
    const id = JSON.stringify(k);
    if (!seen.has(id)) { seen.add(id); out.push(k); }
  }
  return out;
}

export function useLiveUpdates() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return undefined;
    let source = null;
    let dropped = false;
    let fallback = null;
    let closed = false;

    const reload = (topics) => {
      for (const queryKey of keysFor(topics)) queryClient.invalidateQueries({ queryKey });
    };
    const startFallback = () => {
      if (fallback || closed) return;
      fallback = window.setInterval(() => reload(EVERYTHING), FALLBACK_MS);
    };
    const stopFallback = () => { if (fallback) { window.clearInterval(fallback); fallback = null; } };

    const connect = () => {
      if (closed) return;
      source = new window.EventSource(`${API_BASE_URL}/live`, { withCredentials: true });
      source.addEventListener('ready', (event) => {
        // The server is up but not hearing the database yet: refresh on the minute until it is.
        let listening = true;
        try { listening = JSON.parse(event.data)?.listening !== false; } catch { /* keep true */ }
        if (listening) stopFallback(); else startFallback();
        // Back after a drop: reload everything once, since changes meanwhile were not heard.
        if (dropped) { dropped = false; reload(EVERYTHING); }
      });
      source.onmessage = (event) => {
        try {
          const topics = JSON.parse(event.data)?.topics;
          // A message means the server hears the database again: the minute refresh can stop.
          if (Array.isArray(topics) && topics.length) { stopFallback(); reload(topics); }
        } catch { /* not ours */ }
      };
      // Too many screens open for this shop: stop asking, refresh on the minute instead.
      source.addEventListener('busy', () => { source?.close(); startFallback(); });
      source.onerror = () => {
        dropped = true;
        // CLOSED: the browser gave up (signed out, or the server refused). Try again in a while; meanwhile refresh.
        if (source?.readyState === 2) {
          startFallback();
          window.setTimeout(connect, 15_000);
        }
      };
    };
    connect();
    return () => { closed = true; stopFallback(); source?.close(); };
  }, [queryClient]);
}
