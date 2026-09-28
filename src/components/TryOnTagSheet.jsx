import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useBranding } from '../hooks/useBranding';
import { useVariants } from '../hooks/useVariants';

/**
 * Swing tags, one per colour, for hanging on the garments themselves.
 *
 * A QR on a screen helps nobody: the customer is in the shop, holding a saree, and the phone in
 * their hand is not looking at this app. The tag has to be on the piece.
 *
 * ONE TAG PER VARIANT, because a tag is tied to a particular saree. The goldenrod and the crimson
 * are the same product and a completely different decision, and a customer holding one of them
 * has already chosen -- so the code they scan should carry which. It rides as a query parameter,
 * which means a tag printed today still works against a try-on app that does not read it yet, and
 * starts opening the right colour the day it does, with nothing reprinted.
 *
 * SIZED IN MILLIMETRES, not pixels, because this ends up on paper. 50x85mm is a garment swing tag:
 * big enough for a QR that scans across a counter in shop lighting, small enough that six fit on
 * an A4 sheet with room to cut.
 */

/** The QR, big. A small code under a shop's fluorescent tube is a code nobody scans twice. */
const QR_MM = 30;

export default function TryOnTagSheet({ product, onClose }) {
  const { data: branding } = useBranding();
  /*
   * Fetched here rather than read off the product: the product endpoint does not carry variants
   * -- the Variants tab loads them separately -- so a tag sheet built from product.variants
   * quietly printed nothing at all.
   */
  const { data: variants, isLoading } = useVariants(product.id);
  // The api client unwraps to the body, so the rows are data.data -- same as VariantTable.
  const printable = (variants?.data ?? []).filter(v => v.tryOnScanUrl);
  /*
   * What is NOT wanted, rather than what is.
   *
   * This held the selected ids, seeded from printable in a useState initialiser -- which runs
   * once, on the first render, while the variants are still being fetched. printable was empty
   * at that moment, so every tag started unselected and the button read "Print 0 tags". It
   * looked fine in testing only because the Variants tab had already been opened and React Query
   * served the list from cache; a shopkeeper going straight here saw nothing to print.
   *
   * Tracking the exclusions instead makes the default correct no matter when the data lands:
   * everything is printed unless somebody says otherwise, which is also the more useful default.
   */
  const [excluded, setExcluded] = useState(() => new Set());

  const toggle = (id) => setExcluded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const tags = printable.filter(v => !excluded.has(v.id));
  const shopName = branding?.businessName || '';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Print try-on tags"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
        background: 'rgba(10,12,16,.55)', padding: '16px'
      }}>
      <div className="card tagsheet-modal" style={{ width: '100%', maxWidth: '760px', padding: '18px', maxHeight: '94vh', overflowY: 'auto' }}>
        <div className="tagsheet-chrome" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Try-on tags</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Loading the colours…</p>
        ) : printable.length === 0 ? (
          /*
           * Say WHICH nothing. The old line blamed the shop's try-on setup for every empty sheet,
           * including the commonest cause by far -- a product with no colours added yet. A
           * shopkeeper went looking for a setting that was not the problem.
           */
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            {(variants?.data ?? []).length === 0
              ? 'This product has no colours or sizes yet. Add them on the Variants tab and each one gets its own tag.'
              : 'Try-on is not switched on for this workspace yet, so there is no code to put on a tag.'}
          </p>
        ) : (
          <>
            <div className="tagsheet-chrome">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>
                One tag per colour, to hang on the piece itself. A customer scans the tag on the saree
                they are holding and sees it on themselves.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {printable.map(v => (
                  <label key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!excluded.has(v.id)} onChange={() => toggle(v.id)} />
                    {[v.colorName, v.size].filter(Boolean).join(' · ') || v.variantCode}
                  </label>
                ))}
              </div>
            </div>

            {/* What actually prints. Everything else on this screen is hidden by the print rules. */}
            <div className="tagsheet-paper">
              {tags.map(v => (
                <div key={v.id} className="tryon-tag">
                  <div className="tryon-tag-head">
                    {branding?.logoUrl
                      ? <img src={branding.logoUrl} alt="" className="tryon-tag-logo" />
                      : null}
                    {shopName ? <span className="tryon-tag-shop">{shopName}</span> : null}
                  </div>

                  <p className="tryon-tag-call">See it on yourself</p>
                  <p className="tryon-tag-how">Scan with your phone camera</p>

                  <div className="tryon-tag-qr">
                    <QRCodeSVG value={v.tryOnScanUrl} size={128} level="M" />
                  </div>

                  <p className="tryon-tag-title">{product.title}</p>
                  <p className="tryon-tag-variant">
                    {[v.colorName, v.size].filter(Boolean).join(' · ')}
                  </p>
                  {v.sellingPrice != null && (
                    <p className="tryon-tag-price">₹{Number(v.sellingPrice).toLocaleString('en-IN')}</p>
                  )}
                  <p className="tryon-tag-code">{v.variantCode}</p>
                </div>
              ))}
            </div>

            <div className="tagsheet-chrome" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={() => window.print()} disabled={tags.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <Printer size={15} /> Print {tags.length} tag{tags.length === 1 ? '' : 's'}
              </button>
              <button className="btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
