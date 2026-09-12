import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import {
  useShopifyInbox, useReplayShopifyOrder, useReplayAllShopifyOrders, useDismissShopifyOrder
} from '../hooks/useShopify';
import { sectionStyle, headerButton, hint } from './ShopifyLocationPairing';
import { formatINRExact } from '../utils/formatUtils';

/**
 * Shopify orders that could not be placed, and why.
 *
 * Open by default when anything is waiting, because a waiting order is a sale a customer has
 * paid for that this shop's stock does not yet know about. Collapsed when nothing is.
 *
 * One row per ORDER. The server groups the create, the update, the shipment and the refunds that
 * arrived for it; showing each would read as five problems for one sale.
 */
export default function ShopifyOrderInbox() {
  const [view, setView] = useState('open');
  const { data, isLoading, error } = useShopifyInbox(view);
  const { data: openData } = useShopifyInbox('open');
  const replay = useReplayShopifyOrder();
  const replayAll = useReplayAllShopifyOrders();
  const dismiss = useDismissShopifyOrder();

  const waiting = openData?.total ?? 0;
  const [expanded, setExpanded] = useState(null);
  const open = expanded ?? waiting > 0;

  const [dismissing, setDismissing] = useState(null);
  const [reason, setReason] = useState('');

  const submitDismiss = (e, id) => {
    e.preventDefault();
    dismiss.mutate({ id, reason }, {
      onSuccess: () => { setDismissing(null); setReason(''); }
    });
  };

  return (
    <section style={sectionStyle}>
      <button type="button" onClick={() => setExpanded(!open)} aria-expanded={open} style={headerButton}>
        <Inbox size={16} />
        <span style={{ fontWeight: 600 }}>Waiting orders</span>
        {waiting > 0 ? (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            background: 'var(--accent-warning)', color: '#fff'
          }}>{waiting}</span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>None — every Shopify sale has been placed</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div role="tablist" aria-label="Which orders" style={{ display: 'flex', gap: '4px' }}>
              {[['open', 'Waiting'], ['resolved', 'Settled']].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={view === key ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                  {label}
                </button>
              ))}
            </div>
            {view === 'open' && waiting > 0 && (
              <button type="button" className="btn-secondary" onClick={() => replayAll.mutate()} disabled={replayAll.isPending}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                {replayAll.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Retry all
              </button>
            )}
          </div>

          {isLoading && <p style={hint}><Loader2 size={14} className="animate-spin" /> Loading…</p>}
          {error && <p role="alert" style={{ ...hint, color: 'var(--accent-danger)' }}>{error.message || 'Could not load the waiting orders.'}</p>}

          {data && data.entries.length === 0 && (
            <p style={hint}>
              {view === 'open'
                ? <><CheckCircle2 size={14} color="var(--accent-success)" /> Nothing is waiting.</>
                : 'Nothing has been settled yet.'}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data?.entries.map(entry => (
              <article key={entry.id} style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '14px' }}>{entry.orderName}</strong>
                  {entry.total != null && (
                    <span style={{ fontSize: '13px' }}>
                      {entry.currency && entry.currency !== 'INR' ? `${entry.currency} ${entry.total.toFixed(2)}` : formatINRExact(entry.total)}
                    </span>
                  )}
                  <span style={{
                    fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: view === 'open' ? 'var(--accent-warning)' : 'var(--text-secondary)',
                    border: `1px solid ${view === 'open' ? 'var(--accent-warning)' : 'var(--border-light)'}`,
                    borderRadius: '4px', padding: '1px 6px'
                  }}>
                    {view === 'open' ? entry.reasonLabel : (entry.orderNumber ? 'Placed' : 'Dismissed')}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {entry.shopDomain}
                  </span>
                </div>

                {view === 'open' ? (
                  <>
                    <p style={{ margin: '6px 0 2px', fontSize: '12.5px', overflowWrap: 'anywhere' }}>{entry.detail}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.action}</p>
                    {(entry.alsoWaiting.shipment || entry.alsoWaiting.refunds > 0) && (
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Also waiting behind it: {[
                          entry.alsoWaiting.shipment ? 'its shipment' : null,
                          entry.alsoWaiting.refunds > 0 ? `${entry.alsoWaiting.refunds} refund${entry.alsoWaiting.refunds === 1 ? '' : 's'}` : null
                        ].filter(Boolean).join(' and ')}. They are applied straight after the order.
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Waiting since {new Date(entry.firstParkedAt).toLocaleString()} · tried {entry.attempts} time{entry.attempts === 1 ? '' : 's'}
                    </p>

                    {dismissing === entry.id ? (
                      <form onSubmit={e => submitDismiss(e, entry.id)} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <label style={{ flex: '1 1 240px' }}>
                          <span className="sr-only">Why should this order not be placed?</span>
                          <input className="input-field" autoFocus value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="Why should this order not be placed?" maxLength={300} style={{ width: '100%' }} />
                        </label>
                        <button type="submit" className="btn-primary" disabled={dismiss.isPending || reason.trim().length < 4}
                          style={{ fontSize: '12.5px' }}>
                          {dismiss.isPending ? 'Dismissing…' : 'Dismiss order'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => { setDismissing(null); setReason(''); }}
                          style={{ fontSize: '12.5px' }}>Cancel</button>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-secondary"
                          disabled={replay.isPending && replay.variables === entry.id}
                          onClick={() => replay.mutate(entry.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                          {replay.isPending && replay.variables === entry.id
                            ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          Retry
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => { setDismissing(entry.id); setReason(''); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                          <X size={13} /> Dismiss
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                    {entry.orderNumber
                      ? <>Placed as <Link to={`/orders/${entry.salesOrderId}`}>{entry.orderNumber}</Link></>
                      : entry.detail}
                    {entry.resolvedAt && ` · ${new Date(entry.resolvedAt).toLocaleString()}`}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
