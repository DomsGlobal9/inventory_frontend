import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle } from 'lucide-react';
import { formatRupees } from '../utils/money';

/**
 * Products as photographs.
 *
 * A saree is recognised by eye. The table is the right tool for finding a code or sorting by
 * stock, and the wrong one for "which one is the peacock blue with the heavy border" -- a
 * question a shopkeeper answers instantly from a picture and slowly from a list of names.
 *
 * So: mostly photograph, with the few numbers that change what somebody does next. Name, price,
 * and what is on the shelf. Not the category, not the fabric, not the HSN -- those are on the
 * product's own page, and a card that repeats the table has no reason to exist.
 */
export default function ProductGrid({ products, selected, onToggle, onOpen }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      gap: '16px'
    }}>
      {products.map(product => {
        const units = product.variantSummary?.totalUnits ?? 0;
        const low = product.variantSummary?.lowStockVariants ?? 0;
        const isSelected = selected.has(product.id);

        return (
          <motion.div
            key={product.id}
            layout
            onClick={() => onOpen(product.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(product.id); } }}
            aria-label={`Open ${product.title}`}
            style={{
              cursor: 'pointer',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'var(--bg-card)',
              border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '3 / 4', background: 'var(--bg-input)' }}>
              {product.coverImageUrl ? (
                <img
                  src={product.coverImageUrl}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                /*
                 * No photograph is worth saying, not hiding. A product with no picture cannot go
                 * on a storefront and cannot be tried on, and a grid is exactly where that is
                 * visible at a glance rather than found one product at a time.
                 */
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', gap: '6px' }}>
                  <Package size={26} color="var(--text-muted)" />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No photo</span>
                </div>
              )}

              {/* stopPropagation: the card opens the product, and a tick that navigated away
                  would make selecting more than one impossible. */}
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', top: '8px', left: '8px' }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(product.id)}
                  aria-label={`Select ${product.title}`}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </div>

              {product.status !== 'ACTIVE' && (
                <span style={{
                  position: 'absolute', top: '8px', right: '8px',
                  padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
                  fontWeight: 600, textTransform: 'uppercase',
                  background: 'rgba(0,0,0,.6)', color: '#fff'
                }}>{product.status}</span>
              )}
            </div>

            <div style={{ padding: '10px 12px 12px' }}>
              <p
                title={product.title}
                style={{
                  margin: 0, fontSize: '13px', fontWeight: 500, lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >{product.title}</p>

              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                {product.productCode}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{formatRupees(product.basePrice)}</span>
                <span style={{
                  fontSize: '11px',
                  color: units === 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  {low > 0 && units > 0 && <AlertTriangle size={11} color="var(--accent-warning)" />}
                  {units === 0 ? 'Out of stock' : `${units} in stock`}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
