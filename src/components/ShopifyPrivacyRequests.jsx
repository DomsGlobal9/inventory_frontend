import React, { useState } from 'react';
import { ShieldCheck, Download, Loader2 } from 'lucide-react';
import { useShopifyPrivacyRequests, useExportShopifyPrivacyRequest } from '../hooks/useShopify';
import { usePermission } from '../hooks/usePermission';
import { sectionStyle, headerButton, hint } from './ShopifyLocationPairing';

/**
 * Privacy requests Shopify sent on behalf of a customer or the store.
 *
 * Only a data request needs the merchant: Shopify expects the store, not the app, to answer the
 * customer, so it waits here until someone exports it. Erase requests are done on arrival and are
 * listed so the shop can see that they were.
 *
 * Renders nothing until there is a request, so a store that never gets one never sees this.
 */

const TOPIC_LABEL = {
  'customers/data_request': 'Customer asked for their data',
  'customers/redact': 'Customer asked to be erased',
  'shop/redact': 'Store data erased after uninstall'
};

const STATUS = {
  WAITING_FOR_MERCHANT: { label: 'Needs you', colour: 'var(--accent-warning)' },
  COMPLETED: { label: 'Done', colour: 'var(--accent-success)' },
  SKIPPED: { label: 'Not erased', colour: 'var(--text-secondary)' },
  FAILED: { label: 'Will retry', colour: 'var(--accent-danger)' },
  RECEIVED: { label: 'Working', colour: 'var(--text-secondary)' }
};

/** Counts from the server, in words. */
function summaryText(topic, summary) {
  if (!summary) return null;
  const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  if (topic === 'customers/data_request') {
    return `Held: ${n(summary.customers ?? 0, 'customer record', 'customer records')}, ${n(summary.orders ?? 0, 'order', 'orders')}, ${n(summary.shopifyMessages ?? 0, 'Shopify message', 'Shopify messages')}.`;
  }
  const parts = [
    summary.customersErased ? n(summary.customersErased, 'customer erased', 'customers erased') : null,
    summary.ordersCleared ? n(summary.ordersCleared, 'order cleared', 'orders cleared') : null,
    summary.shopifyMessagesCleared ? n(summary.shopifyMessagesCleared, 'Shopify message cleared', 'Shopify messages cleared') : null,
    summary.shopifyMessagesDeleted ? n(summary.shopifyMessagesDeleted, 'Shopify message deleted', 'Shopify messages deleted') : null
  ].filter(Boolean);
  return parts.length ? `${parts.join(', ')}.` : 'Nothing was held.';
}

export default function ShopifyPrivacyRequests() {
  const { data } = useShopifyPrivacyRequests();
  const exportRequest = useExportShopifyPrivacyRequest();
  const { can } = usePermission();
  const mayExport = can('customer:view');
  const [expanded, setExpanded] = useState(null);

  const requests = data ?? [];
  if (requests.length === 0) return null;

  const waiting = requests.filter(r => r.status === 'WAITING_FOR_MERCHANT').length;
  const open = expanded ?? waiting > 0;

  return (
    <section style={sectionStyle}>
      <button type="button" onClick={() => setExpanded(!open)} aria-expanded={open} style={headerButton}>
        <ShieldCheck size={16} />
        <span style={{ fontWeight: 600 }}>Privacy requests</span>
        {waiting > 0 ? (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            background: 'var(--accent-warning)', color: '#fff'
          }}>{waiting}</span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>Nothing needs you</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px' }}>
          <p style={{ ...hint, marginTop: 0 }}>
            When a customer asks your Shopify store what it holds about them, save the file and send it
            to them. Requests to erase a customer are done automatically.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requests.map(r => {
              const status = STATUS[r.status] ?? STATUS.RECEIVED;
              const busy = exportRequest.isPending && exportRequest.variables === r.id;
              return (
                <article key={r.id} style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '14px' }}>{TOPIC_LABEL[r.topic] ?? r.topic}</strong>
                    <span style={{
                      fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                      color: status.colour, border: `1px solid ${status.colour}`, borderRadius: '4px', padding: '1px 6px'
                    }}>{status.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--text-secondary)' }}>{r.shopDomain}</span>
                  </div>

                  <p style={{ margin: '6px 0 2px', fontSize: '12.5px', overflowWrap: 'anywhere' }}>
                    {r.shopifyCustomerId && <>Shopify customer {r.shopifyCustomerId}{r.orderCount > 0 ? ` · ${r.orderCount} order${r.orderCount === 1 ? '' : 's'} named` : ''}. </>}
                    {summaryText(r.topic, r.summary)}
                  </p>
                  {r.detail && <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>{r.detail}</p>}
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Received {new Date(r.receivedAt).toLocaleString()}
                    {r.shopifyRequestId && ` · Shopify request ${r.shopifyRequestId}`}
                    {r.exportedAt && ` · saved ${new Date(r.exportedAt).toLocaleString()}`}
                  </p>

                  {r.canExport && (
                    mayExport ? (
                      <button type="button" className={r.status === 'WAITING_FOR_MERCHANT' ? 'btn-primary' : 'btn-secondary'}
                        // Pinned open first: once this was the last request waiting, the panel would
                        // otherwise fold itself away the moment the save finished.
                        disabled={busy} onClick={() => { setExpanded(true); exportRequest.mutate(r.id); }}
                        style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        {r.exportedAt ? 'Save again' : 'Save what we hold'}
                      </button>
                    ) : (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Someone who can see customers needs to save this and send it on.
                      </p>
                    )
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
