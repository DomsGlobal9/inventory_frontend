import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useInventoryVariants(filters) {
  const queryObj = Object.fromEntries(
    Object.entries(filters || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );
  const queryParams = new URLSearchParams(queryObj).toString();

  return useQuery({
    queryKey: ['inventory-variants', queryObj],
    queryFn: async () => {
      const response = await api.get(`/inventory/variants?${queryParams}`);
      return response.data; // axios interceptor already unwraps response.data -> inner data field
    }
  });
}

export function useInventoryMetadata() {
  return useQuery({
    queryKey: ['inventory-metadata'],
    queryFn: async () => {
      const response = await api.get('/inventory/metadata');
      return response.data;
    }
  });
}

export function useInventoryTransactions(filters) {
  const queryObj = Object.fromEntries(
    Object.entries(filters || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );
  const queryParams = new URLSearchParams(queryObj).toString();

  return useQuery({
    queryKey: ['inventory-transactions', queryObj],
    queryFn: async () => {
      const response = await api.get(`/inventory/transactions?${queryParams}`);
      return response.data; // axios interceptor already unwraps response.data -> inner data field
    }
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-in', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stock added successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to add stock');
    }
  });
}

export function useStockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/stock-out', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stock deducted successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to deduct stock');
    }
  });
}

export function useAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/adjustment', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to adjust stock');
    }
  });
}
