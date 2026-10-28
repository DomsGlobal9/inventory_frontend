import React from 'react';

/**
 * This month's catalog try-on, split the way it is billed (owner, 28 Oct): four-view catalogs,
 * colour variants, and the runs that failed or were cancelled, which are not charged.
 *
 * Shared by the Platform Console and the shop's own Settings screen so the two can never show
 * the same month with different words or different sums. The numbers come straight from the
 * server's summary (catalogs, colourVariants, notCharged); nothing is worked out here.
 *
 * Three tiles in a row that wraps, so at phone width they stack instead of scrolling sideways.
 */
export function formatRupees(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Tile({ value, label, note, accent, testId }) {
  return (
    <div data-testid={testId} style={{
      flex: '1 1 140px', minWidth: 0, background: 'var(--bg-card)',
      border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px 14px',
      borderTop: `3px solid ${accent}`
    }}>
      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px', color: 'var(--text-primary)' }}>{label}</div>
      {note && <div style={{ fontSize: '11.5px', marginTop: '2px', color: 'var(--text-muted)' }}>{note}</div>}
    </div>
  );
}

export default function CatalogUsageTiles({ usage }) {
  if (!usage) return null;
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Tile testId="usage-catalogs" value={usage.catalogs ?? 0} label="Four-view catalogs"
        note="Four views from one photo" accent="var(--brand-solid)" />
      <Tile testId="usage-colours" value={usage.colourVariants ?? 0} label="Colour variants"
        note="A colour made from a finished front view" accent="var(--brand)" />
      <Tile testId="usage-not-charged" value={usage.notCharged ?? 0} label="Failed / cancelled"
        note="Not charged" accent="var(--border-focus)" />
    </div>
  );
}
