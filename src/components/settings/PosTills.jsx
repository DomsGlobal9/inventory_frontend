import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Settings → POS (billing counter), shown only to a shop that has POS (25 Nov 2026).
 *
 * Nothing here is done by hand: ScaleEzy switches POS on from the Platform Console (or the Boutique app's switch), and
 * the till key is made and changed automatically. The shop reads: whether POS is on, where to bill, who signs in, its
 * counters, and any bills left out of Inventory at the till.
 */
const when = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Is POS on for this shop? `managed`: ScaleEzy switched it on; `show`: managed, or a till connected by hand earlier. */
export function usePosState(enabled = true) {
  return useQuery({ queryKey: ['pos', 'state'], queryFn: async () => (await api.get('/pos-connections/state')).data, enabled, staleTime: 60_000, retry: 1 });
}

export default function PosTills() {
  const { data: state } = usePosState();
  const managed = state?.managed === true;
  const { data: tills = [], isLoading } = useQuery({ queryKey: ['pos', 'tills'], queryFn: async () => (await api.get('/pos-connections')).data || [] });
  // Bills the owner chose to leave out at the till. Kept after a till is disconnected.
  const { data: leftOut = [] } = useQuery({ queryKey: ['pos', 'left-out'], queryFn: async () => (await api.get('/pos-connections/left-out')).data || [] });

  const card = { border: '1px solid var(--border-light)', borderRadius: '12px', padding: '18px', marginBottom: '18px' };
  const row = (k, v, first) => (
    <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: '12px', padding: '12px 0', borderTop: first ? 'none' : '1px solid var(--border-light)', fontSize: '13.5px' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{k}</span><span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{v}</span>
    </div>
  );
  // One line per store, not per key: a store can hold an older key beside the switch's, and the shop thinks in counters.
  const working = Object.values(tills.filter(t => t.status === 'ACTIVE').reduce((by, t) => {
    const k = t.locationId ?? t.id;
    const had = by[k];
    by[k] = !had || (t.lastBillAt && (!had.lastBillAt || t.lastBillAt > had.lastBillAt)) ? t : had;
    return by;
  }, {}));

  return (
    <div>
      <h2 style={{ fontSize: '24px', margin: '0 0 8px', color: 'var(--text-primary)' }}>POS (billing counter)</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.6, maxWidth: '60ch' }}>
        Bills made at your counter on ScaleEzy POS take the stock out here and reach the Day Book on their own.
      </p>

      <div style={{ ...card, padding: '6px 18px' }} aria-label="Your POS">
        {row('Status', managed
          ? <span><strong>On</strong>. ScaleEzy switched POS on for {state?.shopName || 'your shop'}.</span>
          : <span><strong>Connected</strong>. Your counter sends its bills here.</span>, true)}
        {managed && row('Bill at', state?.posAddress
          ? <a href={state.posAddress} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>{state.posAddress.replace(/^https?:\/\//, '')}</a>
          : 'Your POS address')}
        {managed && row('Signing in', state?.ownerSignsInWith
          ? `The owner signs in with ${state.ownerSignsInWith}. Staff are added on POS's own Staff screen.`
          : 'The owner signs in with the link ScaleEzy emailed. Staff are added on POS\'s own Staff screen.')}
        {row('Counters', isLoading ? 'Loading…' : working.length
          ? <span>{working.map((t, i) => (
              <span key={t.id} style={{ display: 'block' }}>
                {t.locationName || 'A store'}{t.lastBillAt ? ` · last bill ${when(t.lastBillAt)}` : ' · no bills yet'}
              </span>
            ))}</span>
          : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Monitor size={14} /> No counter is connected right now.</span>)}
        {row('Changes', 'Keys are made and changed automatically. To add a counter, turn POS off, or if the owner cannot sign in, contact ScaleEzy.')}
      </div>

      {leftOut.length ? (
        <section aria-label="Bills not added to Inventory" style={{ ...card, border: '1px solid var(--accent-warning, #b45309)' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 6px' }}>Bills not added to Inventory</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
            These bills were made at the till, but someone chose to leave them out. Their pieces were
            not taken off your stock here, and their money is not in your Day Book. Count those pieces
            at your next stock check.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {leftOut.map((b) => (
              <li key={b.document} style={{ padding: '8px 0', borderTop: '1px solid var(--border-light)', fontSize: '13px', overflowWrap: 'anywhere' }}>
                <strong>{b.document}</strong>{b.shownAs ? ` (shown as ${b.shownAs} at the till)` : ''}{b.locationName ? ` · ${b.locationName}` : ''} · {when(b.skippedAt)}
                {b.reason ? <span style={{ display: 'block', color: 'var(--text-secondary)' }}>“{b.reason}”{b.skippedBy ? ` (${b.skippedBy})` : ''}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
