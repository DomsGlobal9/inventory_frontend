import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Check, ChevronRight, Printer, X } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { usePermission } from '../../hooks/usePermission';
import { useSpotTree, useFillStatus } from '../../hooks/useShelves';

/**
 * "Set up your shelves", on the dashboard, for a shop that has not done it.
 *
 * A feature nobody is told about is a feature nobody uses, so this is the one place it asks. It asks
 * quietly: only owners and managers see it, it disappears as soon as the work is done, and
 * "We don't use shelves" hides it for good on this browser.
 */
const HIDDEN = 'scaleezy_shelves_card_hidden';

export default function SetUpShelvesCard() {
  const { currentLocation } = useLocationContext();
  const { can } = usePermission();
  const locationId = currentLocation?.id;
  const allowed = can('shelf:manage') || can('shelf:putaway');
  const [hidden, setHidden] = React.useState(() => {
    try { return localStorage.getItem(HIDDEN) === '1'; } catch { return false; }
  });

  const tree = useSpotTree(allowed && !hidden ? locationId : null);
  const spots = tree.data?.count ?? 0;
  const fill = useFillStatus(locationId, { enabled: allowed && !hidden && spots > 0 });

  if (!allowed || hidden || !locationId || tree.isLoading) return null;

  const status = fill.data;
  const filledAny = (status?.shelves?.completed ?? 0) > 0;
  const finished = status?.firstFill?.state === 'FINISHED';
  // Nothing to nag about once the shop has its racks and has been round them once.
  if (spots > 0 && finished) return null;

  const steps = [
    { done: spots > 0, label: 'Describe this place', to: '/shelves/setup', hint: 'How many racks, and how many shelves on each' },
    { done: spots > 0, label: 'Print the labels', to: `/shelves/labels?locationId=${locationId}`, hint: 'One sticker per shelf, so a phone can scan it' },
    { done: finished, label: 'Fill your shelves', to: '/shelves/fill', hint: filledAny ? `${status.shelves.completed} of ${status.shelves.total} shelves done` : 'Walk round once and record what is on each shelf' }
  ];
  const next = steps.find(s => !s.done) ?? steps[steps.length - 1];

  const hide = () => {
    try { localStorage.setItem(HIDDEN, '1'); } catch { /* a private window: it just comes back */ }
    setHidden(true);
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14,
      padding: 18, display: 'grid', gap: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Boxes size={20} />
          <div>
            <strong style={{ display: 'block' }}>Find anything in seconds at {currentLocation?.name}</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Tell ScaleEzy where your racks and shelves are, and it can say exactly where each piece is.
            </span>
          </div>
        </div>
        <button type="button" onClick={hide} aria-label="Hide this" title="We don't use shelves"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {steps.map(s => (
          <Link key={s.label} to={s.to} style={{
            display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 10,
            textDecoration: 'none', color: 'inherit',
            background: s === next ? 'var(--bg-input)' : 'transparent'
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${s.done ? 'var(--accent-success, #16a34a)' : 'var(--border-focus)'}`,
              color: 'var(--accent-success, #16a34a)', flexShrink: 0
            }}>{s.done ? <Check size={13} /> : null}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: s === next ? 600 : 400 }}>{s.label}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.hint}</span>
            </span>
            {s.label === 'Print the labels' ? <Printer size={15} /> : <ChevronRight size={16} />}
          </Link>
        ))}
      </div>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        None of this changes your stock numbers. Not using shelves? Press the ✕ and it will not ask again.
      </span>
    </div>
  );
}
