import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * The report endpoints that the backend has always served but nothing ever called.
 *
 * Each one is scoped to the tenant server-side and, where it makes sense, to the location
 * selected in the header -- the backend reads that from the request, so nothing needs to be
 * passed here. Stale times are generous because these are analytical figures, not live stock:
 * a value that is a few minutes old is not misleading, and refetching them on every focus
 * would make the page feel busy for no gain.
 */

/** Products, variants, units, value and low-stock count in one call. */
export function useInventorySummary() {
  return useQuery({
    queryKey: ['reports', 'inventory-summary'],
    queryFn: async () => (await api.get('/reports/inventory-summary')).data,
    staleTime: 5 * 60 * 1000
  });
}

/** Stock value split by how long since each item last moved: 0-30, 31-60, 61-90, 90+ days. */
export function useMovementAging() {
  return useQuery({
    queryKey: ['reports', 'movement-aging'],
    queryFn: async () => (await api.get('/reports/movement-aging')).data || [],
    staleTime: 5 * 60 * 1000
  });
}

/** Stock value grouped by product category. */
export function useCategoryValue() {
  return useQuery({
    queryKey: ['reports', 'category-value'],
    queryFn: async () => (await api.get('/reports/category-value')).data || [],
    staleTime: 5 * 60 * 1000
  });
}

/** Money committed to purchase orders that have been sent but not yet received. */
export function useOpenPoValue() {
  return useQuery({
    queryKey: ['reports', 'open-po-value'],
    queryFn: async () => (await api.get('/reports/open-po-value')).data,
    staleTime: 5 * 60 * 1000
  });
}

/** Value sitting in items that are at or below their reorder level. */
export function useLowStockValue() {
  return useQuery({
    queryKey: ['reports', 'low-stock-value'],
    queryFn: async () => (await api.get('/reports/low-stock-value')).data,
    staleTime: 5 * 60 * 1000
  });
}
