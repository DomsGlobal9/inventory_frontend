import React, { useState } from 'react';
import { MapPin, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useShopifyLocations, usePairShopifyLocation } from '../hooks/useShopify';

/**
 * Which Shopify location is which of ours.
 *
 * Every Shopify sale is placed against the location it is paired with, so this decides whose
 * stock goes down. It is collapsed until opened because showing it asks Shopify -- a Settings page
 * that calls a merchant's store every time somebody passes through it would be slow for no reason.
 *
 * One to one: the select for a Shopify location offers only locations not already paired
 * elsewhere, so the refusal the server would give is never something a merchant can walk into.
 */
export default function ShopifyLocationPairing({ open, onToggle }) {
  const { data, isLoading, error, refetch, isFetching } = useShopifyLocations(open);
  const pair = usePairShopifyLocation();
  const [pending, setPending] = useState(null);

  const pairedCount = data?.shopifyLocations?.filter(l => l.pairedWith).length ?? null;

  const change = (shopifyLocationId, locationId) => {
    setPending(shopifyLocationId);
    pair.mutate(
      { shopifyLocationId, locationId: locationId || null },
      { onSettled: () => setPending(null) }
    );
  };

  return (
    <section style={sectionStyle}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={headerButton}>
        <MapPin size={16} />
        <span style={{ fontWeight: 600 }}>Locations</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
          {pairedCount === null ? 'Pair each Shopify location with one here' : `${pairedCount} of ${data.shopifyLocations.length} paired`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px' }}>
          <p style={hint}>
            A Shopify sale takes its stock from the location it is paired with. An online order
            that names no location uses the one this store sells from.
          </p>

          {isLoading && <p style={hint}><Loader2 size={14} className="animate-spin" /> Asking Shopify for its locations…</p>}

          {error && (
            <div role="alert" style={warningBox}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error.message || 'Could not read your Shopify locations.'}</span>
              <button type="button" className="btn-secondary" onClick={() => refetch()} style={{ fontSize: '12.5px' }}>Try again</button>
            </div>
          )}

          {data && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.shopifyLocations.length === 0 && (
                  <p style={hint}>Shopify says this store has no locations.</p>
                )}
                {data.shopifyLocations.map(loc => {
                  const takenElsewhere = new Set(
                    data.shopifyLocations
                      .filter(l => l.pairedWith && l.shopifyLocationId !== loc.shopifyLocationId)
                      .map(l => l.pairedWith.id)
                  );
                  const busy = pending === loc.shopifyLocationId;
                  return (
                    <div key={loc.shopifyLocationId} style={rowStyle}>
                      <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                        <div style={{ fontWeight: 500, fontSize: '13.5px' }}>{loc.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {[loc.city, loc.fulfillsOnlineOrders ? 'fulfils online orders' : null, loc.isActive ? null : 'inactive in Shopify']
                            .filter(Boolean).join(' · ') || 'Shopify location'}
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
                        <span className="sr-only">Pair {loc.name} with</span>
                        <select
                          className="input-field"
                          value={loc.pairedWith?.id ?? ''}
                          disabled={busy}
                          onChange={e => change(loc.shopifyLocationId, e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">Not paired</option>
                          {data.ourLocations.map(ours => (
                            <option key={ours.id} value={ours.id} disabled={takenElsewhere.has(ours.id)}>
                              {ours.name}{ours.code ? ` (${ours.code})` : ''}{takenElsewhere.has(ours.id) ? ' — already paired' : ''}
                            </option>
                          ))}
                        </select>
                        {busy && <Loader2 size={14} className="animate-spin" />}
                      </label>
                    </div>
                  );
                })}
              </div>

              {data.stalePairings?.length > 0 && (
                <div role="note" style={{ ...warningBox, marginTop: '12px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {data.stalePairings.length} pairing{data.stalePairings.length === 1 ? ' points' : 's point'} at a
                    Shopify location that no longer exists. Orders from it will wait until it is paired again.
                  </span>
                </div>
              )}

              <button type="button" className="btn-secondary" onClick={() => refetch()} disabled={isFetching}
                style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh from Shopify
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export const sectionStyle = { borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginTop: '14px' };
export const headerButton = {
  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%',
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)',
  fontSize: '14px', textAlign: 'left'
};
export const hint = { margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' };
export const warningBox = {
  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 12px',
  borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', fontSize: '12.5px'
};
const rowStyle = {
  display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
  padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: '10px'
};
