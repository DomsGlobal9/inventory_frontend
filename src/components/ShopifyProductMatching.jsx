import React, { useState } from 'react';
import { Package, Loader2, AlertTriangle } from 'lucide-react';
import { useShopifyProductSummary, useMatchShopifyProducts } from '../hooks/useShopify';
import { sectionStyle, headerButton, hint, warningBox } from './ShopifyLocationPairing';

/**
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
  const [result, setResult] = useState(null);

  const run = () => match.mutate(undefined, { onSuccess: setResult });

  return (
    <section style={sectionStyle}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={headerButton}>
        <Package size={16} />
        <span style={{ fontWeight: 600 }}>Products</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
          {summary ? `${summary.matched} matched` : 'Match Shopify products by SKU'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '14px' }}>
          <p style={hint}>
            Each Shopify product is matched to yours by SKU, ignoring spaces and capitals. Nothing
            in your Shopify store is changed.
          </p>

          <button type="button" className="btn-primary" onClick={run} disabled={match.isPending}
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

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '18px', fontWeight: 600 }}>{value}</div>
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
