/**
 * Cache invalidation for the DERIVED views.
 *
 * Most screens read a resource directly and their own hook invalidates it. The aggregate
 * screens don't: the Dashboard, the report widgets and the inventory rollups are computed
 * from stock, orders and purchase orders, so nothing about them looks like the thing you
 * just mutated -- and every one of them was left out of every mutation's onSuccess.
 *
 * Combined with their staleTime (dashboard-summary 1 min, dead-stock and supplier-spend
 * 5 min, snapshots and stock-movement 10 min) that meant: receive a PO, open the Dashboard,
 * and see the old inventory value until the timer expired or the page was reloaded.
 *
 * invalidateQueries ignores staleTime -- it marks the query stale and refetches it if it is
 * currently mounted, otherwise on its next mount. So calling this after any stock-affecting
 * mutation is what makes those screens correct, and the staleTimes stay useful for plain
 * navigation.
 *
 * Keys are matched by prefix, so ['reports'] covers reports/dead-stock,
 * reports/recent-transactions, reports/snapshots and reports/stock-movement.
 */
export function invalidateDerivedViews(queryClient) {
  const keys = [
    ['dashboard-summary'],       // Dashboard.jsx headline figures
    ['dashboard'],               // legacy dashboard key still used by some hooks
    ['reports'],                 // dead stock, recent transactions, snapshots, stock movement
    ['inventory-variants'],      // Inventory Overview rows
    ['inventory-transactions'],  // Inventory Ledger
    ['inventory'],               // alerts + inventory rollups
  ];
  keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
}

/**
 * Anything that moves stock also moves money and alert state, so these two always travel
 * together. Callers that additionally own a specific resource (a PO, an order) should
 * invalidate that resource themselves as well.
 */
export function invalidateAfterStockChange(queryClient) {
  invalidateDerivedViews(queryClient);
  queryClient.invalidateQueries({ queryKey: ['variants'] });
}

/**
 * Patch the Inventory Overview rows from a stock mutation's own response, so the number
 * changes the instant the server confirms instead of after a list refetch.
 *
 * Without this the flow was: mutate -> success toast -> invalidate -> refetch. On this
 * database a refetch is several seconds, so the user saw "Stock added successfully" above a
 * row still showing the old quantity, which reads as a failed save.
 *
 * applyMovement returns { quantity, globalQuantity, averageCost } -- `quantity` is the new
 * quantity AT THE MUTATED LOCATION, `globalQuantity` is across all locations. The overview
 * shows whichever of those matches the query's own location filter, so we mirror that here
 * rather than guessing. The invalidation still runs afterwards and is the source of truth;
 * this only removes the visible lag.
 */
export function patchInventoryRows(queryClient, variables, result) {
  if (!result || !variables?.variantId) return;

  queryClient.setQueriesData({ queryKey: ['inventory-variants'] }, (old) => {
    if (!old?.items) return old;

    // The cache key's second element is the filter object this query was built from.
    return {
      ...old,
      items: old.items.map((row) => {
        if (row.variantId !== variables.variantId) return row;
        const averageCost = Number(result.averageCost ?? row.averageCost);
        // Location-scoped views get the location figure; the unscoped view gets the global.
        const quantity = Number(
          result.globalQuantity !== undefined && !variables.locationId
            ? result.globalQuantity
            : result.quantity ?? row.quantity
        );
        return { ...row, quantity, averageCost, inventoryValue: quantity * averageCost };
      })
    };
  });
}
