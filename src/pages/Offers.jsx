import React, { useState } from 'react';
import { Plus, Play, Pause, Archive, Tag, Search } from 'lucide-react';
import { useOffers, useCreateOffer, useUpdateOffer, useSetOfferStatus } from '../hooks/useOffers';
import { usePermission } from '../hooks/usePermission';
import { formatINR } from '../utils/formatUtils';
import PageLoader from '../components/PageLoader';
import ConfirmModal from '../components/ConfirmModal';
import OfferEditor from '../components/OfferEditor';

/**
 * Every discount this shop runs, in one place.
 *
 * The status a merchant reads is `effectiveStatus`, not the column. An offer switched on last
 * month that stopped on its own three weeks ago says EXPIRED here, because that is what it IS --
 * showing ACTIVE because a column says so is how somebody spends a morning wondering why a sale
 * is not applying.
 */

const TONE = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',  fg: 'rgb(21,128,61)',   label: 'Running' },
  SCHEDULED: { bg: 'rgba(59,130,246,0.12)', fg: 'rgb(29,78,216)',   label: 'Starts later' },
  DRAFT:     { bg: 'rgba(107,114,128,0.12)',fg: 'rgb(75,85,99)',    label: 'Draft' },
  PAUSED:    { bg: 'rgba(234,179,8,0.15)',  fg: 'rgb(161,98,7)',    label: 'Paused' },
  EXPIRED:   { bg: 'rgba(107,114,128,0.12)',fg: 'rgb(107,114,128)', label: 'Ended' },
  ARCHIVED:  { bg: 'rgba(107,114,128,0.08)',fg: 'rgb(156,163,175)', label: 'Retired' }
};

const FILTERS = ['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'ARCHIVED'];

function Pill({ status }) {
  const tone = TONE[status] ?? TONE.DRAFT;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
      backgroundColor: tone.bg, color: tone.fg, whiteSpace: 'nowrap'
    }}>{tone.label}</span>
  );
}

/** "20% off, up to ₹2,000" — the rule in the merchant's own terms, not the enum's. */
function describe(offer) {
  const value = Number(offer.value);
  const base =
    offer.valueType === 'PERCENTAGE' ? `${value}% off`
    : offer.valueType === 'FIXED_AMOUNT' ? `${formatINR(value)} off`
    : `${formatINR(value)} each`;

  const cap = offer.maxDiscount ? `, up to ${formatINR(Number(offer.maxDiscount))}` : '';
  const where =
    offer.scope === 'ALL' ? 'everything'
    : offer.scope === 'CATEGORY' ? `${offer.targets?.length ?? 0} categor${(offer.targets?.length ?? 0) === 1 ? 'y' : 'ies'}`
    : `${offer.targets?.length ?? 0} item${(offer.targets?.length ?? 0) === 1 ? '' : 's'}`;

  return `${base}${cap} on ${where}`;
}

/**
 * The shop's own timezone, and the exclusive end said the way a person means it.
 *
 * `endsAt` is stored as the first moment the offer is NOT running -- 1 Oct 00:00 for an offer
 * that ends on 30 September. Showing that verbatim tells a merchant their September sale ends in
 * October, so a whole day is subtracted for display.
 */
function endLabel(endsAt) {
  if (!endsAt) return 'No end date';
  const d = new Date(new Date(endsAt).getTime() - 1000);
  return `Ends ${d.toLocaleDateString()}, 11:59 pm`;
}

export default function Offers() {
  const { can } = usePermission();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);   // an offer, {} for new, or null
  const [retiring, setRetiring] = useState(null);

  const { data: offers, isLoading } = useOffers({ status, search });
  const createMutation = useCreateOffer();
  const updateMutation = useUpdateOffer();
  const statusMutation = useSetOfferStatus();

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
        {can('offer:create') && (
          <button className="btn-primary" onClick={() => setEditing({})}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> New offer
          </button>
        )}
      </div>

      <div className="mobile-col" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setStatus(f)}
              className={status === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 14px', fontSize: '13px' }}>
              {f === 'ALL' ? 'All' : (TONE[f]?.label ?? f)}
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
                  <tr key={offer.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 500 }}>{offer.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {offer.offerCode}
                        {offer.couponCode && (
                          <span style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-input)', fontFamily: 'monospace' }}>
                            {offer.couponCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{describe(offer)}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {endLabel(offer.endsAt)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {offer.redemptionCount ?? 0}
                      {offer.usageLimit ? <span style={{ color: 'var(--text-secondary)' }}> / {offer.usageLimit}</span> : null}
                    </td>
                    <td style={{ padding: '16px 20px' }}><Pill status={offer.effectiveStatus} /></td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {can('offer:update') && offer.status !== 'ARCHIVED' && (
                        <>
                          {offer.status === 'ACTIVE' ? (
                            <button className="btn-secondary" title="Pause this offer"
                              style={{ padding: '6px 10px', marginRight: '6px' }}
                              onClick={() => statusMutation.mutate({ id: offer.id, status: 'PAUSED' })}>
                              <Pause size={15} />
                            </button>
                          ) : (
                            <button className="btn-secondary" title="Start this offer"
                              style={{ padding: '6px 10px', marginRight: '6px' }}
                              onClick={() => statusMutation.mutate({ id: offer.id, status: 'ACTIVE' })}>
                              <Play size={15} />
                            </button>
                          )}
                          <button className="btn-secondary" style={{ padding: '6px 12px', marginRight: '6px' }}
                            onClick={() => setEditing(offer)}>Edit</button>
                        </>
                      )}
                      {can('offer:archive') && offer.status !== 'ARCHIVED' && (
                        <button className="btn-secondary" title="Retire this offer"
                          style={{ padding: '6px 10px' }} onClick={() => setRetiring(offer)}>
                          <Archive size={15} />
                        </button>
                      )}
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
          offer={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing.id) await updateMutation.mutateAsync({ id: editing.id, ...data });
            else await createMutation.mutateAsync(data);
            setEditing(null);
          }}
        />
      )}

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
