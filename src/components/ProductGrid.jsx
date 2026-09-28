import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle } from 'lucide-react';
import { formatRupees } from '../utils/money';

/**
 * The catalogue as photographs -- one card per COLOUR, not per product.
 *
 * A saree is recognised by eye, and what a shopkeeper is looking for is never "the product". It
 * is the crimson one. A card showing the goldenrod photograph while standing for three colours is
 * a card somebody scrolls straight past, which defeats the only reason to have a photo view at
 * all.
 *
 * So each variant gets its own card, with its own picture, its own price and its own stock. A
 * product with no variants still gets one card, because a catalogue that hides a product until
 * somebody adds a colour to it is a catalogue that has lost a product.
 *
 * Clicking any card opens the PRODUCT -- there is no per-variant page, and the product page is
 * where its colours are managed.
 */
export default function ProductGrid({ products, selected, onToggle, onOpen }) {
  /*
   * Flattened here rather than in the parent, because selection still belongs to the PRODUCT.
   * Publish and unpublish act on products, so ticking the crimson card selects the saree, and
   * every colour of that saree shows as ticked. Anything else would let somebody tick two cards
   * and see "1 selected", which is the kind of small lie that stops people trusting a screen.
   */
  const cards = products.flatMap(product => {
    const colours = product.colours?.length ? product.colours : [null];
    return colours.map(colour => ({ product, colour }));
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      gap: '16px'
    }}>
      {cards.map(({ product, colour }) => {
        const units = colour ? colour.units : (product.variantSummary?.totalUnits ?? 0);
        const price = colour?.sellingPrice ?? product.basePrice;
        const photo = colour?.photoUrl ?? product.coverImageUrl;
        const isSelected = selected.has(product.id);
        const label = [colour?.colorName, colour?.size].filter(Boolean).join(' · ');

        return (
          <motion.div
            key={colour ? colour.id : product.id}
            layout
            onClick={() => onOpen(product.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(product.id); } }}
            aria-label={`Open ${product.title}${label ? `, ${label}` : ''}`}
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
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                /*
                 * No photograph is worth saying, not hiding. A colour with no picture cannot go on
                 * a storefront and cannot be tried on, and a grid is exactly where that is visible
                 * at a glance rather than found one product at a time.
                 */
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', gap: '6px' }}>
                  <Package size={26} color="var(--text-muted)" />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No photo</span>
                </div>
              )}

              {/* stopPropagation: the card opens the product, and a tick that navigated away
                  would make selecting more than one impossible. */}
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '8px', left: '8px' }}>
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

              {/* The colour is what the card IS. Falls back to the code when a variant has no
                  colour name, so the card always says which one it is. */}
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {label || colour?.variantCode || product.productCode}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{formatRupees(price)}</span>
                <span style={{
                  fontSize: '11px',
                  color: units === 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
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
