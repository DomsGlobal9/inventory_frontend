/**
 * When a variant counts as low. The browser's copy of one rule, matching lib/lowStock.ts.
 *
 * There were two definitions across the product. Most screens compared stock against the
 * reorder level exactly; the Inventory Overview and the supplier's item list substituted 10
 * whenever the reorder level was 0. The same variant could therefore read "Low Stock" on one
 * screen and healthy on another.
 *
 * The exact level wins, because the codebase already says what 0 means -- reorder
 * suggestions skip those rows as "not tracked for reordering". A shop that sets 0 is saying
 * "do not chase me about this one".
 *
 * Nothing was visibly broken only because adding a product sets a reorder level of 5 on
 * every variant, so a 0 was rare. The bulk importer can now write one, which is why this was
 * settled before that shipped rather than after.
 */
export function isLowStock(quantityOnHand, reorderLevel) {
  const level = Number(reorderLevel ?? 0);
  if (!(level > 0)) return false;        // not tracked
  return Number(quantityOnHand ?? 0) <= level;
}

/** The number to show beside a badge, or null when the variant is not tracked. */
export function lowStockThreshold(reorderLevel) {
  const level = Number(reorderLevel ?? 0);
  return level > 0 ? level : null;
}
