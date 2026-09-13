import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Archive, CalendarClock, Store, Pencil, AlertTriangle } from 'lucide-react';
import { useOffer, useUpdateOffer, useSetOfferStatus } from '../hooks/useOffers';
import { usePermission } from '../hooks/usePermission';
import { formatINRExact } from '../utils/formatUtils';
import { describeOffer, offerSummaryInput } from '../utils/offerSummary';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';
import OfferEditor from '../components/OfferEditor';
import OfferStatusPill from '../components/OfferStatusPill';
import OfferShopifyPanel, { ShopifyChip } from '../components/OfferShopifyPanel';

/**
 * One offer: what it does, whether it worked, who used it, and every change made to it.
 *
 * The numbers are only what can be known. "Sales with this offer" is the total of the bills that
 * used it -- not extra sales it caused, which nobody can measure and a page should not pretend to.
 * A use given back by a cancelled order is shown as given back, not quietly subtracted, so the
 * count here and the allowance on the list can always be reconciled by eye.
 */

const dateTime = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function endText(endsAt) {
  if (!endsAt) return 'Until you stop it';
  const d = new Date(endsAt);
  if (d.getHours() === 0 && d.getMinutes() === 0) return `${dateOnly(new Date(d.getTime() - 1000))}, end of day`;
  return dateTime(d);
}

function Stat({ label, value, note }) {
  return (
    <div className="card" style={{ padding: '16px 18px', minWidth: 0 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: 'clamp(19px, 5vw, 24px)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {note && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{note}</div>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{children}</dd>
    </div>
  );
}

const cardTitle = { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' };

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const { data: offer, isLoading, error } = useOffer(id);
  const updateMutation = useUpdateOffer();
  const statusMutation = useSetOfferStatus();
  const [editing, setEditing] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [onShopify, setOnShopify] = useState(false);

  if (isLoading) return <PageLoader text="LOADING OFFER..." />;
  if (error || !offer) {
    return (
      <div className="card" style={{ maxWidth: '560px', margin: '48px auto', padding: '40px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>{error?.message || 'That offer no longer exists.'}</p>
        <Link to="/offers" style={{ display: 'inline-block', marginTop: '16px', color: 'var(--text-primary)' }}>Back to offers</Link>
      </div>
    );
  }

  const { headline, qualifiers } = describeOffer(offerSummaryInput(offer));
  const stats = offer.stats ?? {};
  const live = offer.status !== 'ARCHIVED';
  const startsLater = new Date(offer.startsAt) > new Date();
  const channels = offer.channels?.length ? offer.channels.map(c => ({ POS: 'Till', ONLINE: 'Online store', MANUAL: 'Manual orders', MARKETPLACE: 'Marketplaces' }[c] ?? c)) : null;
  const missingTargets = (offer.targets ?? []).filter(t => t.missing).length;

  const conditions = [
    offer.trigger === 'CODE' && `Code ${offer.couponCode}`,
    offer.minSubtotal && `Spend ${formatINRExact(Number(offer.minSubtotal))}${offer.scope === 'ALL' ? '' : ' on those items'}`,
    offer.minQuantity && `${offer.minQuantity}+ ${offer.scope === 'ALL' ? 'items' : 'of those items'}`
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%' }}>
      {/* Header */}
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
          <button onClick={() => navigate('/offers')} aria-label="Back to offers"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', paddingTop: '6px', width: 'auto' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '28px', margin: 0, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{offer.name}</h1>
              <OfferStatusPill status={offer.effectiveStatus} />
              {offer.shopify && <ShopifyChip status={offer.shopify.status} problem={offer.shopify.problem} />}
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {offer.offerCode}
              {offer.couponCode && (
                <span style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-input)', fontFamily: 'var(--font-mono)' }}>{offer.couponCode}</span>
              )}
            </div>
          </div>
        </div>

        {live && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {can('offer:update') && (offer.status === 'ACTIVE' ? (
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => statusMutation.mutate({ id: offer.id, status: 'PAUSED' })} disabled={statusMutation.isPending}>
                <Pause size={15} /> Pause
              </button>
            ) : (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => statusMutation.mutate({ id: offer.id, status: 'ACTIVE' })} disabled={statusMutation.isPending}>
                {startsLater ? <><CalendarClock size={15} /> Schedule</> : <><Play size={15} /> Start</>}
              </button>
            ))}
            {can('offer:update') && (
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setEditing(true)}>
                <Pencil size={15} /> Edit
              </button>
            )}
            {(can('offer:publish_external') || offer.shopify) && (
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setOnShopify(true)}>
                <Store size={15} /> Shopify
              </button>
            )}
            {can('offer:archive') && (
              <button className="btn-secondary" title="Retire this offer" aria-label="Retire this offer" onClick={() => setRetiring(true)}>
                <Archive size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* What it does */}
      <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{headline}</div>
        {qualifiers.length > 0 && (
          <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {qualifiers.map((q, i) => <span key={i}>{i ? ' · ' : ''}{q[0].toUpperCase() + q.slice(1)}</span>)}
          </div>
        )}

        {missingTargets > 0 && (
          <div role="status" style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', background: 'rgba(234,179,8,0.12)', color: 'rgb(161,98,7)', fontSize: '13px' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            {missingTargets === 1 ? 'One item this offer names has been deleted.' : `${missingTargets} items this offer names have been deleted.`} Edit the offer to remove {missingTargets === 1 ? 'it' : 'them'}.
          </div>
        )}

        <dl className="mobile-2-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 24px', margin: '22px 0 0', paddingTop: '20px', borderTop: '1px solid var(--border-light)' }}>
          <Row label="Applies to">
            {offer.level === 'ORDER' ? 'The whole bill'
              : offer.scope === 'ALL' ? 'Everything'
              : (
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {offer.targets.slice(0, 8).map(t => (
                    <span key={t.refId} style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-input)', fontSize: '13px', color: t.missing ? 'var(--text-muted)' : undefined, textDecoration: t.missing ? 'line-through' : undefined }}>
                      {t.label}
                    </span>
                  ))}
                  {offer.targets.length > 8 && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>+{offer.targets.length - 8} more</span>}
                </span>
              )}
          </Row>
          <Row label="Needs">{conditions.length ? conditions.join(' · ') : 'Nothing'}</Row>
          <Row label="Sells at">
            {channels ? channels.join(', ') : 'Till and online'}
            {offer.locations?.length > 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {offer.locations.map(l => l.active ? l.name : `${l.name} (closed)`).join(', ')}
              </div>
            )}
          </Row>
          <Row label="Starts">{dateTime(offer.startsAt)}</Row>
          <Row label="Ends">{endText(offer.endsAt)}</Row>
          <Row label="Limits">
            {[offer.usageLimit && `${offer.usageLimit} uses in total`, offer.usageLimitPerCustomer && `${offer.usageLimitPerCustomer} per customer`].filter(Boolean).join(' · ') || 'None'}
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Priority {offer.priority} · {offer.stackable ? 'combines with others' : "doesn't combine"}
            </div>
          </Row>
        </dl>
      </div>

      {/* Results */}
      {/* Two across on a phone rather than four stacked: four cards of one number each would push the
          orders, which are what somebody opened this page to see, a whole screen down. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Stat label="Times used" value={`${stats.timesUsed ?? 0}${offer.usageLimit ? ` / ${offer.usageLimit}` : ''}`}
          note={stats.givenBack ? `${stats.givenBack} given back by cancelled orders` : (stats.usesLeft != null ? `${stats.usesLeft} left` : null)} />
        <Stat label="Discount given" value={formatINRExact(Number(stats.totalDiscounted ?? 0))} />
        <Stat label="Sales with this offer" value={formatINRExact(Number(stats.salesMade ?? 0))} note="Bill totals, after discount" />
        <Stat label="Customers" value={stats.customers ?? 0} />
      </div>

      {/* Orders */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={cardTitle}>Orders that used it</h2>
        </div>
        {offer.recentUses?.length ? (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  {['ORDER', 'CUSTOMER', 'DATE', 'BILL', 'DISCOUNT'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offer.recentUses.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)', opacity: u.status === 'RELEASED' ? 0.6 : 1 }}>
                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                      {can('sales_order:view')
                        ? <Link to={`/orders/${u.orderId}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.orderNumber ?? 'Order'}</Link>
                        : <span style={{ fontWeight: 500 }}>{u.orderNumber ?? 'Order'}</span>}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.channel === 'ONLINE' ? 'Online' : u.channel === 'POS' ? 'Till' : (u.channel ?? '')}</div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>{u.customerName || <span style={{ color: 'var(--text-muted)' }}>Walk-in</span>}</td>
                    <td style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{dateTime(u.createdAt)}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>{u.orderTotal != null ? formatINRExact(Number(u.orderTotal)) : '—'}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {u.status === 'RELEASED'
                        ? <span title="The order was cancelled, so this use was given back" style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Given back</span>
                        : formatINRExact(Number(u.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {offer.recentUses.length === 25 && (
              <div style={{ padding: '10px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>Showing the 25 most recent.</div>
            )}
          </div>
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {offer.status === 'DRAFT' ? 'No orders yet. Start the offer and they will appear here.' : 'No orders have used this offer yet.'}
          </div>
        )}
      </div>

      {/* History */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ ...cardTitle, marginBottom: '14px' }}>History</h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(offer.history ?? []).map((h, i, all) => (
            <li key={h.id} style={{ display: 'flex', gap: '14px', paddingBottom: i === all.length - 1 ? 0 : '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', marginTop: '5px', background: i === 0 ? 'var(--text-primary)' : 'var(--border-focus)' }} />
                {i < all.length - 1 && <span style={{ flex: 1, width: '1px', background: 'var(--border-light)', marginTop: '4px' }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {h.version === 1 ? 'Created' : `Changed`}
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                    {' · '}{dateTime(h.createdAt)}{h.changedBy ? ` · ${h.changedBy}` : ''}
                  </span>
                </div>
                {h.note && h.note !== 'Created' && <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', fontStyle: 'italic' }}>“{h.note}”</div>}
                {h.changes?.length > 0 && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {h.changes.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px' }}>
          Orders keep the version that priced them, so changing an offer never changes a past bill.
        </div>
      </div>

      {editing && (
        <OfferEditor
          offer={offer}
          onClose={() => setEditing(false)}
          onSave={async (data) => {
            await updateMutation.mutateAsync({ id: offer.id, ...data });
            setEditing(false);
          }}
        />
      )}

      {onShopify && <OfferShopifyPanel offer={offer} onClose={() => setOnShopify(false)} />}

      <ConfirmModal
        isOpen={retiring}
        onClose={() => setRetiring(false)}
        title="Retire this offer?"
        message={`"${offer.name}" will stop applying and cannot be started again. Orders that already used it keep their prices.`}
        confirmText="Retire offer"
        confirmStyle="danger"
        onConfirm={async () => {
          await statusMutation.mutateAsync({ id: offer.id, status: 'ARCHIVED' });
          setRetiring(false);
        }}
      />
    </div>
  );
}
