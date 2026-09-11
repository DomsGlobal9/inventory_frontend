import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { invalidateDerivedViews } from '../lib/invalidate';

export function useTransactions(filters) {
  // Clean empty filters
  const queryObj = Object.fromEntries(
    Object.entries(filters || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );

  const queryParams = new URLSearchParams(queryObj).toString();

  return useQuery({
    queryKey: ['transactions', queryObj],
    queryFn: async () => {
      /*
       * Return the whole body, not body.data.
       *
       * api.ts's response interceptor already returns response.data, so `api.get` hands back
       * the BODY -- { success, data: [...] }. Taking .data here unwrapped it a second time, so
       * this resolved to the bare array, and TransactionHistory's `data?.data || []` then read
       * .data off an array, got undefined, and fell back to the empty list. Every time.
       *
       * The result was an Inventory History tab that said "No transactions found." on a
       * product with four movements in the database, whatever the Type and Reason filters
       * were set to -- a screen that states, in words, something untrue about the shop's
       * stock. Reported from production on PRD-000002, which has had four rows since 7 Sept.
       */
      return api.get(`/inventory/transactions?${queryParams}`);
    }
  });
}

export function useCreateTransaction(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/transactions', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['variants', productId] });
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
      }
      invalidateDerivedViews(queryClient); // Dashboard + reports + inventory rollups
      toast.success('Transaction recorded successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to record transaction');
    }
  });
}
