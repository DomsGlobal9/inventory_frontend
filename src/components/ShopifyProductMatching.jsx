import React, { useState } from 'react';
import { Package, Loader2, AlertTriangle, UploadCloud, RotateCcw } from 'lucide-react';
import {
  useShopifyProductSummary, useMatchShopifyProducts, useShopifyPushSummary, usePutAllOnShopify, useRetryShopifyPush
} from '../hooks/useShopify';
import { sectionStyle, headerButton, hint, warningBox } from './ShopifyLocationPairing';

/**
 * Our products in Shopify: the ones put there from here, and the ones matched by SKU.
 *
 * Putting a product on Shopify makes it there with its photos, sizes, price and stock, and keeps it
 * true afterwards. Matching adopts a product the shop built by hand in Shopify; from then on only its
 * price and stock follow ours.
 *
 * Which Shopify products are which of ours, by SKU.
 *
 * Nothing is changed in Shopify. The button reads the store and adopts every variant whose SKU is
 * unmistakably one of ours; anything that could be two things is listed with the reason rather
 * than guessed, because a wrong match books a sale against the wrong saree and nothing looks
 * broken afterwards.
 *
 * The last result is kept on screen after the run. The lists of "only in Shopify" and "could not
 * match" are the merchant's to-do list, and a toast that vanishes in four seconds is not one.
 */
export default function ShopifyProductMatching({ open, onToggle }) {
  const { data: summary } = useShopifyProductSummary(true);
  const match = useMatchShopifyProducts();
  const { data: push } = useShopifyPushSummary(true);
  const putAll = usePutAllOnShopify();
  const retry = useRetryShopifyPush();
  const [result, setResult] = useState(null);
  const notPaired = push && push.pairedLocations === 0;

  const run = () => match.mutate(undefined, { onSuccess: setResult });

  return (
    <section style={sectionStyle}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={headerButton}>
        <Package size={16} />
        <span style={{ fontWeight: 600 }}>Products</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
          {push ? `${push.onShopify} on Shopify${push.sending ? ` · ${push.sending} sending` : ''}${push.failed ? ` · ${push.failed} could not be sent` : ''}`
            : summary ? `${summary.matched} matched` : 'Match Shopify products by SKU'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px' }}>
          {push && (
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '13px', marginBottom: '12px' }}>
              <Stat label="On Shopify" value={push.onShopify} />
              <Stat label="Up to date" value={push.upToDate} />
              <Stat label="Sending" value={push.sending} />
              <Stat label="Could not send" value={push.failed} danger={push.failed > 0} />
            </div>
          )}

          {notPaired && (
            <div style={{ ...warningBox, marginBottom: '12px' }}>
              <AlertTriangle size={14} /> Pair a Shopify location with one of your stores first (Locations, above), so Shopify knows where the stock is.
            </div>
          )}

          <p style={hint}>
            Put a product on Shopify and it appears there with its photos, sizes, price and stock, and
            stays up to date. You can also switch each product on or off on its own page. Switched off
            or deleted here, it is archived in Shopify, never deleted. Stock goes out from your paired
            store only.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={() => putAll.mutate()} disabled={putAll.isPending || notPaired}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {putAll.isPending ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {putAll.isPending ? 'Putting them on…' : `Put all products on Shopify${push ? ` (${Math.max(0, push.activeProducts - push.onShopify)} more)` : ''}`}
            </button>
            {push?.failed > 0 && (
              <button type="button" className="btn-secondary" onClick={() => retry.mutate()} disabled={retry.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={15} /> Try the {push.failed} again
              </button>
            )}
          </div>

          {push?.problems?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <Listing
                tone="warning"
                title={`${push.failed} could not be sent`}
                rows={push.problems.map(p => ({ key: p.productId, sku: p.productCode, text: `${p.title} — ${p.problem}` }))}
                more={push.failed - push.problems.length}
              />
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-light)', margin: '16px 0 12px' }} />
          <p style={hint}>
            Already have products in Shopify that you made there by hand? Match them by SKU (spaces and
            capitals ignored). Their title and photos stay as you wrote them in Shopify; only their price
            and stock follow ScaleEzy from then on.
          </p>

          <button type="button" className="btn-secondary" onClick={run} disabled={match.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {match.isPending && <Loader2 size={15} className="animate-spin" />}
            {match.isPending ? 'Reading your Shopify products…' : 'Match products by SKU'}
          </button>

          {result && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '13px' }}>
                <Stat label="In Shopify" value={result.shopifyVariants} />
                <Stat label="Newly matched" value={result.newlyMatched} />
                <Stat label="Already matched" value={result.alreadyMatched} />
                <Stat label="No SKU in Shopify" value={result.withoutSku} />
              </div>

              {result.problems.count > 0 && (
                <Listing
                  tone="warning"
                  title={`${result.problems.count} could not be matched safely`}
                  rows={result.problems.examples.map(p => ({ key: `${p.sku}-${p.title}`, sku: p.sku, text: `${p.title} — ${p.problem}` }))}
                  more={result.problems.count - result.problems.examples.length}
                />
              )}

              {result.notHere.count > 0 && (
                <Listing
                  title={`${result.notHere.count} exist only in Shopify`}
                  note="Add these here with the same SKU, then match again. Orders containing them wait until you do."
                  rows={result.notHere.examples.map(n => ({ key: n.sku, sku: n.sku, text: n.title }))}
                  more={result.notHere.count - result.notHere.examples.length}
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: danger ? 'var(--accent-danger)' : undefined }}>{value}</div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

function Listing({ title, note, rows, more, tone }) {
  return (
    <div style={tone === 'warning' ? { ...warningBox, display: 'block' } : { fontSize: '12.5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '6px' }}>
        {tone === 'warning' && <AlertTriangle size={14} />} {title}
      </div>
      {note && <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>{note}</div>}
      <ul style={{ margin: 0, paddingLeft: '18px', maxHeight: '180px', overflowY: 'auto' }}>
        {rows.map(r => (
          <li key={r.key} style={{ marginBottom: '3px', overflowWrap: 'anywhere' }}>
            <code style={{ fontSize: '12px' }}>{r.sku}</code> {r.text}
          </li>
        ))}
      </ul>
      {more > 0 && <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>…and {more} more</div>}
    </div>
  );
}
