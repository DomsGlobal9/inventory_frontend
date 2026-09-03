// Frontend mirror of the backend's resolveVariantForLocation (backend/src/utils/variant-location.ts).
// One place decides what a variant actually sells for, so the price on a barcode label,
// the price on an order line, and the price a storefront is quoted can never disagree.
//
// Precedence, most specific first:
//   1. the location's priceOverride  -- this store charges something different
//   2. the variant's sellingPrice    -- set per size/colour in the Variants table
//   3. the product's basePrice       -- the catalogue-wide default
export function resolveVariantPrice(variant, locationId) {
  if (!variant) return null;

  const profile = locationId
    ? (variant.locationProfiles || []).find((p) => p.locationId === locationId)
    : null;

  if (profile && profile.priceOverride !== null && profile.priceOverride !== undefined) {
    return Number(profile.priceOverride);
  }

  if (variant.sellingPrice !== null && variant.sellingPrice !== undefined) {
    return Number(variant.sellingPrice);
  }

  const basePrice = variant.product?.basePrice;
  if (basePrice !== null && basePrice !== undefined) {
    return Number(basePrice);
  }

  return null;
}

// Rupees for print output. Deliberately "Rs." and not "₹": barcode labels are rendered by
// @react-pdf with the standard Helvetica/Courier fonts, whose WinAnsiEncoding has no
// rupee glyph -- emitting ₹ there produces a broken character on the sticker.
export function formatRupeesForPrint(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return `Rs.${Number(value).toFixed(2)}`;
}
