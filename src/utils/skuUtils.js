/**
 * One place that decides what a variant's stock code looks like.
 *
 * This existed twice, and the two copies had drifted -- which is the whole reason it is now
 * a file. The Add Product wizard built `PRD-000054-BLA-XS`; the "Generate Variants" panel on
 * an existing product built `SE-6623-BLA-XS`, inventing a random number because nobody had
 * passed it the product's real code. Both wrote to the same table, so a single product ended
 * up with variants whose codes shared no prefix, and two variants of PRD-000027 carried two
 * different random ones. Twenty-four variants in the live catalogue are in that state.
 *
 * The random part was worse than untidy. `Math.random() * 1000` has a thousand values, so two
 * products drawing the same number produce colliding SKUs -- and a collision is not loud: the
 * server either renames the newcomer to `-2` or refuses it, and the refusal was counted as
 * "skipped" in a summary nobody read.
 *
 * WHY THE STRIPPING. A SKU is not decoration. It goes into barcodes, into CSV columns that
 * are read back by position, into search boxes and into URLs, and a space breaks all four --
 * far from here and much later. The wizard learned this when "Free Size" produced
 * `PRD-000002-PIN-Free Size`; the generator never did, and `SE-5379-PUR-Free Size` is in the
 * database to prove it. Sizes that are already plain (S, M, L, XL, 32) pass through untouched.
 */

/** Upper-case, letters and digits only, trimmed to length. */
const safe = (value, len) =>
  String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, len);

/**
 * The stock code for one colour/size of a product.
 *
 * `productCode` must be the code the BACKEND assigned (PRD-000054), not anything the form
 * made up: the server generates its own sequential code and ignores whatever the client sent.
 * Passing a falsy code is a programming error rather than a user one -- it means a caller was
 * not given the product it is adding to -- so it throws instead of quietly inventing one,
 * which is exactly the behaviour that produced the SE- prefixes.
 */
export function buildVariantSku(productCode, colorName, size) {
  if (!productCode) {
    throw new Error('buildVariantSku: productCode is required -- refusing to invent a SKU prefix');
  }
  const safeColor = safe(colorName, 3) || 'STD';
  // 'STD' rather than an empty segment: a size of "-" or "??" would otherwise leave the SKU
  // ending in a stray hyphen.
  const safeSize = safe(size, 8) || 'STD';
  return `${productCode}-${safeColor}-${safeSize}`;
}

export { safe as sanitiseSkuPart };
