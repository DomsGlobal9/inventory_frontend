import React, { useEffect } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { useWhereIs } from '../../hooks/useShelves';
import Select from '../common/Select';

/**
 * "Which shelf are these coming off?" for stock going out by hand -- a write-off, a transfer. Optional:
 * left on "Let the app decide", the shelf rule takes Not shelved first and raises an issue only if it
 * has to guess a shelf. Choosing a shelf records exactly that one.
 *
 * Shows nothing when the location has no shelves for this item, or the person cannot see shelves.
 */
export default function TakeFromShelf({ variantId, locationId, quantity, value, onChange, compact = false }) {
  const { can } = usePermission();
  const allowed = can('shelf:view');
  const where = useWhereIs(allowed ? variantId : null, locationId);
  const place = where.data?.places?.find(p => p.locationId === locationId);
  const shelves = place?.shelves ?? [];
  const qty = Number(quantity) || 0;

  // A choice that no longer fits (quantity raised past what the shelf holds) is cleared, not sent.
  useEffect(() => {
    if (!value) return;
    const s = shelves.find(x => x.spotId === value);
    if (!s || qty > s.quantity) onChange(null);
  }, [value, qty, shelves, onChange]);

  if (!allowed || !variantId || shelves.length === 0) return null;

  return (
    <div className="form-group" style={{ display: 'grid', gap: 6 }}>
      <label className="form-label">Taken from which shelf?</label>
      <Select className="input-field" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label="Taken from which shelf">
        <option value="">Let the app decide{place?.notShelved ? ` (${place.notShelved} not shelved first)` : ''}</option>
        {shelves.map(s => (
          <option key={s.spotId} value={s.spotId} disabled={qty > s.quantity}>
            {s.address}{s.name ? ` — ${s.name}` : ''} · {s.quantity} there{qty > s.quantity ? ' (not enough)' : ''}
          </option>
        ))}
      </Select>
      {!compact && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Choosing the shelf keeps "Where is it?" exact.</span>}
    </div>
  );
}

/** The request field for a chosen shelf. */
export const fromSpotsFor = (spotId, quantity) => (spotId && Number(quantity) > 0 ? [{ spotId, quantity: Number(quantity) }] : undefined);
