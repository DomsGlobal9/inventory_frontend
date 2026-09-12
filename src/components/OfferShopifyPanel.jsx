import React, { useEffect } from 'react';
import { X, Loader2, Store, AlertTriangle, CheckCircle2, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import {
  useOfferShopify, usePutOfferOnShopify, useTakeOfferOffShopify,
  usePushOfferToShopify, useAcceptShopifyVersion
} from '../hooks/useOffers';
import { usePermission } from '../hooks/usePermission';

/**
 * One offer's copy on the connected Shopify store.
 *
 * Every state says what it means for a customer, because that is the only thing a merchant needs
 * from this panel. "Synced" is not enough -- "Shopify charges the same as this offer" is. And the
 * states that are not fine say what to do: a reason it cannot be put on Shopify, what changed there,
 * which button fixes it.
 */

export const SHOPIFY_STATES = {
  PENDING:     { label: 'Sending to Shopify', tone: 'var(--text-secondary)', meaning: 'Shopify is being updated. This takes up to a minute.' },
  SYNCED:      { label: 'On Shopify',          tone: 'var(--accent-success)', meaning: 'Shopify charges the same as this offer.' },
  DRIFTED:     { label: 'Changed in Shopify',  tone: 'var(--accent-warning)', meaning: null },
  FAILED:      { label: 'Not on Shopify',       tone: 'var(--accent-danger)',  meaning: null },
  UNSUPPORTED: { label: 'Cannot go on Shopify', tone: 'var(--accent-warning)', meaning: null },
  REMOVING:    { label: 'Taking off Shopify',   tone: 'var(--text-secondary)', meaning: 'Removing the discount from your Shopify store.' }
};

export function ShopifyChip({ status, problem }) {
  const state = SHOPIFY_STATES[status];
  if (!state) return null;
  return (
    <span title={problem || state.meaning || ''} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
      color: state.tone, border: `1px solid ${state.tone}`, borderRadius: '10px', padding: '2px 8px', whiteSpace: 'nowrap'
    }}>
      <Store size={11} /> {state.label}
    </span>
  );
}

export default function OfferShopifyPanel({ offer, onClose }) {
  const { can } = usePermission();
  const { data, isLoading, error, refetch, isFetching } = useOfferShopify(offer.id);
  const put = usePutOfferOnShopify();
  const off = useTakeOfferOffShopify();
  const push = usePushOfferToShopify();
  const accept = useAcceptShopifyVersion();

  const busy = put.isPending || off.isPending || push.isPending || accept.isPending;

  // Escape closes it, as a dialog is expected to -- except mid-request, when closing would hide
  // whether the change went through.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);
  const mayPublish = can('offer:publish_external');
  const mirror = data?.mirror;
  const state = mirror ? SHOPIFY_STATES[mirror.status] : null;
  const deletedThere = mirror?.status === 'FAILED' && (mirror.problem || '').startsWith('Deleted in Shopify');

  const button = (label, Icon, mutation, style = 'btn-secondary') => (
    <button type="button" className={style} disabled={busy} onClick={() => mutation.mutate(offer.id)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
      {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} {label}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="offer-shopify-title" style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }} onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="card" style={{ width: '560px', maxWidth: '100%', padding: 0, maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Store size={18} />
          <h3 id="offer-shopify-title" style={{ margin: 0, fontSize: '17px', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {offer.name} on Shopify
          </h3>
          <button type="button" aria-label="Close" onClick={() => !busy && onClose()}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
          {isLoading && <p style={{ margin: 0, color: 'var(--text-secondary)' }}><Loader2 size={14} className="animate-spin" /> Checking…</p>}
          {error && <p role="alert" style={{ margin: 0, color: 'var(--accent-danger)' }}>{error.message || 'Could not read this offer\'s Shopify copy.'}</p>}

          {data && !data.connected && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              No Shopify store is connected to this workspace. Connect one in Settings &gt; Storefront to put offers on it.
            </p>
          )}

          {data?.connected && (
            <>
              <div style={{ color: 'var(--text-secondary)' }}>{data.shopDomain}</div>

              {!data.canWrite && (
                <div role="note" style={warn}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>Your Shopify store has not given this app permission to manage discounts. Reconnect it in Settings &gt; Storefront and approve discounts.</span>
                </div>
              )}

              {mirror ? (
                <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <ShopifyChip status={mirror.status} problem={mirror.problem} />
                    {(mirror.status === 'PENDING' || mirror.status === 'REMOVING') && <Loader2 size={14} className="animate-spin" />}
                    <button type="button" onClick={() => refetch()} disabled={isFetching} title="Check again"
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <p style={{ margin: '10px 0 0', overflowWrap: 'anywhere' }}>{mirror.problem || state?.meaning}</p>
                  {mirror.lastCheckedAt && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Last checked {new Date(mirror.lastCheckedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : data.canBeMirrored ? (
                <p style={{ margin: 0, display: 'flex', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--accent-success)" style={{ flexShrink: 0 }} />
                  This offer can be put on your Shopify store, and Shopify will charge the same as it does here.
                </p>
              ) : (
                <div role="note" style={warn}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>This offer cannot go on Shopify as it is.</strong>
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {data.reasons.map(r => <li key={r} style={{ marginBottom: '3px' }}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {mayPublish ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!mirror && data.canBeMirrored && data.canWrite && offer.status !== 'DRAFT' &&
                    button('Put on Shopify', Upload, put, 'btn-primary')}
                  {!mirror && offer.status === 'DRAFT' && (
                    <span style={{ color: 'var(--text-secondary)' }}>Start the offer first. A draft is not put on Shopify.</span>
                  )}
                  {mirror?.status === 'DRIFTED' && button('Push ours', Upload, push, 'btn-primary')}
                  {mirror?.status === 'DRIFTED' && can('offer:update') && button('Accept theirs', Download, accept)}
                  {mirror?.status === 'FAILED' && button(deletedThere ? 'Push ours' : 'Retry', Upload, push, 'btn-primary')}
                  {mirror && mirror.status !== 'REMOVING' && button('Take off Shopify', Trash2, off)}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Putting offers on Shopify needs permission to publish offers. Ask whoever manages your team.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const warn = {
  display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px',
  background: 'rgba(245, 158, 11, 0.1)', fontSize: '13px'
};
