import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useTransactions(filters) {
  // Clean empty filters
  const queryObj = Object.fromEntries(
    Object.entries(filters || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );

  const queryParams = new URLSearchParams(queryObj).toString();

  return useQuery({
    queryKey: ['transactions', queryObj],
    queryFn: async () => {
      const response = await api.get(`/inventory/transactions?${queryParams}`);
      return response.data;
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transaction recorded successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to record transaction');
    }
  });
}
