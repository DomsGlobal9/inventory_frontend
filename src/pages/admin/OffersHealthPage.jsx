import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, BadgePercent, AlertTriangle } from 'lucide-react';
import LoadFailed from '../../components/LoadFailed';
import { useAdminOffersHealth } from '../../hooks/admin/useAdminConsole';
import PageGuide from '../../components/admin/PageGuide';
import { formatINR } from '../../utils/formatUtils';
import { rowLink } from '../../components/common/rowLink';

/**
 * Offers and Shopify across every shop, worst first.
 *
 * What support is asked about -- "my discount stopped working on Shopify", "an order never came
 * through", "the codes do nothing" -- had no screen: the only way to answer was to sign in as the
 * shop. Each row says what is wrong in words, so the person reading it knows what to do next.
 */

const COPY_LABEL = { SYNCED: 'on Shopify', PENDING: 'waiting to copy', FAILED: 'failed', DRIFTED: 'changed in Shopify', UNSUPPORTED: "can't be copied", REMOVING: 'being removed' };
// Why a Shopify order is waiting, said for one or for several.
const REASON_LABEL = {
  UNMAPPED_LOCATION: ['location not paired', 'locations not paired'], UNMAPPED_VARIANT: ['product not matched', 'products not matched'],
  CURRENCY_MISMATCH: ['in the wrong currency', 'in the wrong currency'], NOT_SYNCED: ['not synced yet', 'not synced yet'],
  UNCLAIMED_INSTALL: ['store not claimed', 'store not claimed'], RECONCILE_MISMATCH: ['totals disagree', 'totals disagree'], FAILED: ['failed', 'failed']
};
const reasonText = (reason, count) => `${count} ${(REASON_LABEL[reason] ?? [reason.toLowerCase(), reason.toLowerCase()])[count === 1 ? 0 : 1]}`;

function Tile({ label, value, warn }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 600, color: warn ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function OffersHealthPage() {
  const { data, isLoading, isError, error, refetch } = useAdminOffersHealth();
  const navigate = useNavigate();
  const clients = data?.clients ?? [];
  const p = data?.platform;

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BadgePercent size={22} color="var(--accent-gold)" /> Offers &amp; Shopify
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Discounts every shop is running, and whether their Shopify copies and orders are getting through. Shops that need somebody come first.
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--accent-gold)' }} />
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading data...</div>
        </div>
      ) : isError ? (
        <LoadFailed what="offers and Shopify health" error={error} onRetry={refetch} />
      ) : (
        <>
          {p && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <Tile label="Shops needing attention" value={`${p.shopsNeedingAttention} of ${p.shops}`} warn={p.shopsNeedingAttention > 0} />
              <Tile label="Offers running" value={p.offersRunning} />
              <Tile label="Offer uses, last 30 days" value={p.usesLast30Days} />
              <Tile label="Discount given, last 30 days" value={formatINR(p.discountGivenLast30Days)} />
              <Tile label="Shopify copies failing" value={p.shopifyCopiesFailing} warn={p.shopifyCopiesFailing > 0} />
              <Tile label="Shopify orders waiting" value={p.shopifyOrdersWaiting + p.shopifyOrdersUnclaimed} warn={p.shopifyOrdersWaiting + p.shopifyOrdersUnclaimed > 0} />
            </div>
          )}
          {p?.shopifyOrdersUnclaimed > 0 && (
            <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(234,179,8,0.12)', color: 'rgb(161,98,7)', fontSize: '13px', marginBottom: '16px' }}>
              <AlertTriangle size={16} /> {p.shopifyOrdersUnclaimed} Shopify order{p.shopifyOrdersUnclaimed === 1 ? '' : 's'} came from a store no shop has claimed yet, so {p.shopifyOrdersUnclaimed === 1 ? 'it belongs' : 'they belong'} to nobody until it is.
            </div>
          )}

          <div className="table-container" style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'auto hidden', background: 'var(--bg-card)' }}>
            <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)' }}>
                  {/* Needs attention second: on a phone the table scrolls sideways, and this is the column to see without scrolling. */}
                  {['Client', 'Needs attention', 'Offers', 'Last 30 days', 'Till limit', 'Shopify'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No shops yet.</td></tr>
                )}
                {clients.map(c => {
                  const copies = Object.entries(c.shopify.copies);
                  return (
                    <tr key={c.clientId}
                      {...rowLink(() => navigate(`/platformconsole/clients/${c.clientId}`), { label: `Open ${c.clientId}` })}
                      style={{ borderTop: '1px solid var(--border-light)', verticalAlign: 'top' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{c.clientId}</td>
                      <td style={{ padding: '10px 16px', minWidth: '220px' }}>
                        {c.attention.length === 0 ? (
                          <span style={{ color: 'var(--accent-success)' }}>Nothing</span>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--accent-danger)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {c.attention.map(a => <li key={a}>{a}</li>)}
                            {c.rolesMissingOfferPermissions.length > 0 && (
                              <li style={{ listStyle: 'none', marginLeft: '-16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{c.rolesMissingOfferPermissions.join('; ')}</li>
                            )}
                          </ul>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                        {c.offers.total === 0 ? <span style={{ color: 'var(--text-muted)' }}>None</span> : (
                          <>
                            <div style={{ color: 'var(--text-primary)' }}>{c.offers.running} running</div>
                            <div style={{ fontSize: '12px' }}>{[c.offers.scheduled && `${c.offers.scheduled} starting later`, c.offers.waiting && `${c.offers.waiting} draft or paused`].filter(Boolean).join(' · ')}</div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                        {c.last30Days.uses === 0 ? <span style={{ color: 'var(--text-muted)' }}>No uses</span> : (
                          <>
                            <div style={{ color: 'var(--text-primary)' }}>{c.last30Days.uses} use{c.last30Days.uses === 1 ? '' : 's'} · {formatINR(c.last30Days.discountGiven)} off</div>
                            <div style={{ fontSize: '12px' }}>{c.last30Days.ordersWithOffers} order{c.last30Days.ordersWithOffers === 1 ? '' : 's'}</div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{c.tillLimitPercent == null ? 'No limit' : `${c.tillLimitPercent}%`}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                        {copies.length === 0 && c.shopify.ordersWaiting === 0 ? <span style={{ color: 'var(--text-muted)' }}>Nothing on Shopify</span> : (
                          <>
                            {copies.length > 0 && <div>{copies.map(([s, count]) => `${count} ${COPY_LABEL[s] ?? s.toLowerCase()}`).join(' · ')}</div>}
                            {c.shopify.ordersWaiting > 0 && (
                              <div style={{ fontSize: '12px', color: 'var(--accent-danger)' }}>
                                {c.shopify.ordersWaiting} order{c.shopify.ordersWaiting === 1 ? '' : 's'} waiting: {Object.entries(c.shopify.ordersWaitingByReason).map(([r, count]) => reasonText(r, count)).join(', ')}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PageGuide title="About Offers & Shopify">
        <p>One row per shop, with the ones that need somebody first.</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
          <li><strong>Copies that failed:</strong> an offer the shop put on Shopify that Shopify refused, or that could not be reached. The shop's offer page says why.</li>
          <li><strong>Orders waiting:</strong> Shopify orders parked because a location or product is not paired yet. The shop lets them in from its Shopify panel once it is.</li>
          <li><strong>No codes left:</strong> an offer running on single-use codes where every code has been used, so new customers are told the code is not valid.</li>
          <li><strong>Missing permissions:</strong> a built-in role that lacks an offer permission a new shop's role would have, so somebody cannot do what their role says.</li>
        </ul>
      </PageGuide>
    </div>
  );
}
