/*
 * The product form's friendly words, and the API's strict ones.
 *
 * The product type used to be a two-entry lookup with `|| 'READY_TO_WEAR'` after it. The picker
 * offers a third option -- UNSTITCHED -- so choosing it showed as chosen, saved, and came back as
 * a ready-to-wear product. Silently: nothing failed, nothing was reported, and the shop had a
 * saree recorded as stitched apparel, which is also the wrong GST treatment.
 *
 * Derived from the label now rather than listed, so an option added to a client's catalogue
 * config cannot go missing from here again. Only CUSTOM needs naming, because "Custom Made" does
 * not spell its own enum.
 */
const PRODUCT_TYPE_ALIASES: Record<string, string> = {
  CUSTOM_MADE: 'CUSTOM',
  MADE_TO_ORDER: 'CUSTOM'
};

/** "Ready to Wear" -> READY_TO_WEAR, "Unstitched" -> UNSTITCHED. */
const toEnumish = (label: unknown) =>
  String(label ?? '').trim().toUpperCase().replace(/[\s/-]+/g, '_');

/** Enum values the API accepts. Anything else falls back, as it always did. */
const PRODUCT_TYPES = new Set(['READY_TO_WEAR', 'CUSTOM', 'UNSTITCHED']);

export const toApiProductType = (label: unknown): string => {
  const key = toEnumish(label);
  const mapped = PRODUCT_TYPE_ALIASES[key] ?? key;
  return PRODUCT_TYPES.has(mapped) ? mapped : 'READY_TO_WEAR';
};

/** READY_TO_WEAR -> "Ready to Wear". The picker matches on the label, so it has to come back. */
export const toFormProductType = (value: unknown): string => {
  const known: Record<string, string> = {
    READY_TO_WEAR: 'Ready to Wear',
    CUSTOM: 'Custom Made',
    UNSTITCHED: 'Unstitched'
  };
  const key = toEnumish(value);
  return known[key] ?? 'Ready to Wear';
};

export const mapProductFormToApiPayload = (formData: any) => {
  /*
   * GST travels with the product from the moment it is created.
   *
   * It was asked for only when editing an existing product, so every product ever added through
   * the wizard started with no HSN code and no rate -- and a product with no rate cannot go on a
   * tax invoice. The shop found out at the counter, one product at a time.
   *
   * Left out of the payload entirely when not filled in, rather than sent as an empty string or
   * a zero: the API treats absent as "not set" and 0 as "exempt", and those are different answers.
   */
  const tax: Record<string, unknown> = {};
  if (formData.hsnCode) tax.hsnCode = String(formData.hsnCode).trim();
  if (formData.taxRateBps !== '' && formData.taxRateBps != null) {
    tax.taxRateBps = Number(formData.taxRateBps);
  }
  if (typeof formData.taxSlabbed === 'boolean') tax.taxSlabbed = formData.taxSlabbed;

  return {
    title: formData.title,
    productCode: formData.productCode || `SE-${Math.floor(Math.random() * 10000)}`, // Fallback if missing
    description: formData.description,
    category: formData.category?.toUpperCase() || 'WOMEN',
    productType: toApiProductType(formData.productType),
    dressType: formData.dressType,
    fabric: formData.fabric,
    craft: formData.craft,
    brand: formData.brand,
    basePrice: Number(formData.price) || 0,
    ...tax,
    isService: Boolean(formData.isService),
    status: formData.isPublished ? 'ACTIVE' : 'DRAFT'
  };
};

export const mapApiProductToForm = (apiData: any) => {
  // Translate back for the UI Wizard
  return {
    ...apiData,
    price: apiData.basePrice.toString(),
    productType: toFormProductType(apiData.productType),
    hsnCode: apiData.hsnCode ?? '',
    taxRateBps: apiData.taxRateBps == null ? '' : String(apiData.taxRateBps),
    taxSlabbed: Boolean(apiData.taxSlabbed),
    isService: Boolean(apiData.isService),
    isPublished: apiData.status === 'ACTIVE'
  };
};
