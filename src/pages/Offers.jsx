import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Archive, Tag, Search, CalendarClock, Store, CopyPlus, SlidersHorizontal } from 'lucide-react';
import { useOffers, useCreateOffer, useUpdateOffer, useSetOfferStatus, useDuplicateOffer } from '../hooks/useOffers';
import TillRulesDialog from '../components/TillRulesDialog';
import { usePermission } from '../hooks/usePermission';
import { useMediaQuery } from '../hooks/useMediaQuery';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';
import OfferEditor from '../components/OfferEditor';
import OfferShopifyPanel, { ShopifyChip } from '../components/OfferShopifyPanel';
import OfferStatusPill, { OFFER_TONE } from '../components/OfferStatusPill';
import { describeOffer, offerSummaryInput } from '../utils/offerSummary';
import { rowLink } from '../components/common/rowLink';

/**
 * Every discount this shop runs, in one place.
 *
 * The status a merchant reads is `effectiveStatus`, not the column. An offer switched on last
 * month that stopped on its own three weeks ago says EXPIRED here, because that is what it IS --
 * showing ACTIVE because a column says so is how somebody spends a morning wondering why a sale
 * is not applying.
 */

// SCHEDULED and EXPIRED are filters even though no column holds them -- they are what the dates
// say, and a merchant asking "what starts next week" is asking a real question the status column
// cannot answer.
const FILTERS = ['ALL', 'ACTIVE', 'SCHEDULED', 'DRAFT', 'PAUSED', 'EXPIRED', 'ARCHIVED'];

/** "20% off every Saree", "₹500 off the whole bill" -- the same words the offer page and editor use. */
const describe = (offer) => describeOffer(offerSummaryInput(offer));

const shortDate = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * The exclusive end, said the way a person means it.
 *
 * `endsAt` is stored as the first moment the offer is NOT running -- 1 Oct 00:00 for an offer that
 * ends on 30 September. Printing that verbatim tells a merchant their September sale ends in
 * October.
 *
 * When it lands exactly on midnight it means "all of the previous day", so that is what is shown.
 * When it does not, the merchant chose a time deliberately -- a flash sale ending at 6pm -- and
 * that time is theirs to see.
 */
function endLabel(endsAt) {
  if (!endsAt) return 'No end date';
  const d = new Date(endsAt);
  const atMidnight = d.getHours() === 0 && d.getMinutes() === 0;
  if (atMidnight) {
    const lastDay = new Date(d.getTime() - 1000);
    return `Ends ${shortDate(lastDay)}, 11:59 pm`;
  }
  return `Ends ${shortDate(d)}, ${shortTime(d)}`;
}

/** For an offer whose moment has not come, when it does is the more useful half. */
function whenLabel(offer) {
  if (offer.effectiveStatus === 'SCHEDULED') {
    const d = new Date(offer.startsAt);
    const atMidnight = d.getHours() === 0 && d.getMinutes() === 0;
    return `Starts ${shortDate(d)}${atMidnight ? '' : `, ${shortTime(d)}`}`;
  }
  return endLabel(offer.endsAt);
}

export default function Offers() {
  const { can } = usePermission();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // an offer, {} for new, or null
  const [retiring, setRetiring] = useState(null);
  const [onShopify, setOnShopify] = useState(null);   // the offer whose Shopify panel is open

  const { data: offers, isLoading } = useOffers({ status, search });
  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const statusMutation = useSetOfferStatus();
  const duplicateMutation = useDuplicateOffer();
  const navigate = useNavigate();
  const [tillRules, setTillRules] = useState(false);
  const phone = useMediaQuery('(max-width: 640px)');

  /**
   * What can be done to one offer. The same buttons in the table and on a phone's card, so the two
   * layouts can never offer different things.
   */
  const actionsFor = (offer) => (
    <>
      {can('offer:update') && offer.status !== 'ARCHIVED' && (
        <>
          {offer.status === 'ACTIVE' ? (
            <button className="btn-secondary" title="Pause this offer"
              style={{ padding: '6px 10px', marginRight: '6px' }}
              onClick={() => statusMutation.mutate({ id: offer.id, status: 'PAUSED' })}>
              <Pause size={15} />
            </button>
          ) : (
            // "Schedule" when its start is still ahead. Pressing Start on an offer
            // that begins next Friday and watching nothing happen is how a
            // merchant concludes the button is broken.
            <button className="btn-secondary"
              title={new Date(offer.startsAt) > new Date() ? 'Schedule this offer' : 'Start this offer'}
              style={{ padding: '6px 10px', marginRight: '6px' }}
              onClick={() => statusMutation.mutate({ id: offer.id, status: 'ACTIVE' })}>
              {new Date(offer.startsAt) > new Date()
                ? <CalendarClock size={15} />
                : <Play size={15} />}
            </button>
          )}
          <button className="btn-secondary" style={{ padding: '6px 12px', marginRight: '6px' }}
            onClick={() => setEditing(offer)}>Edit</button>
        </>
      )}
      {can('offer:create') && (
        <button className="btn-secondary" title="Copy into a new draft" aria-label={`Duplicate ${offer.name}`}
          style={{ padding: '6px 10px', marginRight: '6px' }} disabled={duplicateMutation.isPending}
          onClick={async () => {
            try {
              const copy = await duplicateMutation.mutateAsync(offer.id);
              navigate(`/offers/${copy.id}`);
            } catch { /* shown by the mutation */ }
          }}>
          <CopyPlus size={15} />
        </button>
      )}
      {offer.status !== 'ARCHIVED' && (can('offer:publish_external') || offer.shopify) && (
        <button className="btn-secondary" title="Shopify"
          aria-label={`${offer.name} on Shopify`}
          style={{ padding: '6px 10px', marginRight: '6px' }} onClick={() => setOnShopify(offer)}>
          <Store size={15} />
        </button>
      )}
      {can('offer:archive') && can('offer:update') && offer.status !== 'ARCHIVED' && (
        <button className="btn-secondary" title="Retire this offer"
          style={{ padding: '6px 10px' }} onClick={() => setRetiring(offer)}>
          <Archive size={15} />
        </button>
      )}
    </>
  );

  if (isLoading) return <PageLoader text="LOADING OFFERS..." />;

  const rows = offers ?? [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%' }}>
      <div className="mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>Offers</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
            Write a discount once. It applies wherever you sell.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {can('offer:manual_discount') || can('offer:settings') ? (
            <button className="btn-secondary" onClick={() => setTillRules(true)} title="How much the till may take off by hand"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <SlidersHorizontal size={16} /> Till rules
            </button>
          ) : null}
          {can('offer:create') && (
            <button className="btn-primary" onClick={() => setEditing({})}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>
              <Plus size={18} /> New offer
            </button>
          )}
        </div>
      </div>

      <div className="mobile-col" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setStatus(f)}
              className={status === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 14px', fontSize: '13px' }}>
              {f === 'ALL' ? 'All' : (OFFER_TONE[f]?.label ?? f)}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" placeholder="Search by name or code"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Tag size={32} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
            {search || status !== 'ALL' ? 'Nothing matches that.' : 'No offers yet.'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
            {search || status !== 'ALL'
              ? 'Try a different filter.'
              : 'An offer written here applies at the till and on your website.'}
          </p>
        </div>
      ) : phone ? (
        /* A card per offer on a phone. The table needed 760px, so at 390px USED, STATUS and every
           button sat off-screen inside a sideways scroller -- whether an offer was running could
           not be seen without sliding. */
        <ul aria-label="Offers" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rows.map(offer => (
            <li key={offer.id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/offers/${offer.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', overflowWrap: 'anywhere' }}>
                    {offer.name}
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {offer.offerCode}{offer.couponCode ? ` · ${offer.couponCode}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <OfferStatusPill status={offer.effectiveStatus} />
                  {offer.shopify && <ShopifyChip status={offer.shopify.status} problem={offer.shopify.problem} />}
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-primary)' }}>{describe(offer).headline}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {whenLabel(offer)} · Used {offer.redemptionCount ?? 0}{offer.usageLimit ? ` of ${offer.usageLimit}` : ''}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px 0' }}>
                {actionsFor(offer)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Scrolls sideways inside the card rather than being clipped by it, and the first
              column stays put -- the same treatment every other table here gets. */}
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  {['OFFER', 'WHAT IT DOES', 'WHEN', 'USED', 'STATUS', ''].map((h, i) => (
                    <th key={h || i} style={{ padding: '14px 20px', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '13px', textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(offer => (
                  <tr
                    key={offer.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    {...rowLink(() => navigate(`/offers/${offer.id}`), { label: `Open ${offer.title || 'offer'}` })}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <Link to={`/offers/${offer.id}`} style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}>
                        {offer.name}
                      </Link>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {offer.offerCode}
                        {offer.couponCode && (
                          <span style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-input)', fontFamily: 'monospace' }}>
                            {offer.couponCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{describe(offer).headline}</div>
                      {describe(offer).qualifiers.length > 0 && (
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>
                          {describe(offer).qualifiers.filter(q => !q.startsWith('from ') && !q.startsWith('until ')).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {whenLabel(offer)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {offer.redemptionCount ?? 0}
                      {offer.usageLimit ? <span style={{ color: 'var(--text-secondary)' }}> / {offer.usageLimit}</span> : null}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        <OfferStatusPill status={offer.effectiveStatus} />
                        {/* Only when the offer HAS a Shopify copy. An offer that was never put on
                            Shopify is not "not on Shopify" in any way a merchant needs telling. */}
                        {offer.shopify && <ShopifyChip status={offer.shopify.status} problem={offer.shopify.problem} />}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {actionsFor(offer)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <OfferEditor
          // The list's current copy rather than the one clicked, so an offer retired meanwhile
          // shows as retired in the editor instead of failing at Save.
          offer={editing.id ? (offers?.find(o => o.id === editing.id) ?? editing) : null}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing.id) await updateMutation.mutateAsync({ id: editing.id, ...data });
            else await createMutation.mutateAsync(data);
            setEditing(null);
          }}
        />
      )}

      {onShopify && <OfferShopifyPanel offer={onShopify} onClose={() => setOnShopify(null)} />}
      {tillRules && <TillRulesDialog canEdit={can('offer:settings')} onClose={() => setTillRules(false)} />}

      <ConfirmModal
        isOpen={!!retiring}
        onClose={() => setRetiring(null)}
        title="Retire this offer?"
        message={`"${retiring?.name}" will stop applying and cannot be started again. Orders that already used it keep their prices.`}
        confirmText="Retire offer"
        confirmStyle="danger"
        onConfirm={async () => {
          await statusMutation.mutateAsync({ id: retiring.id, status: 'ARCHIVED' });
          setRetiring(null);
        }}
      />
    </div>
  );
}
