import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useStockCounts = () => {
  return useQuery({
    queryKey: ['stock-counts'],
    queryFn: async () => {
      const response = await api.get('/stock-counts');
      return response.data;
    }
  });
};

export const useStockCount = (id) => {
  return useQuery({
    queryKey: ['stock-counts', id],
    queryFn: async () => {
      const response = await api.get(`/stock-counts/${id}`);
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/stock-counts', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Stock count created successfully');
      queryClient.invalidateQueries(['stock-counts']);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create stock count');
    }
  });
};

export const useStartStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/stock-counts/${id}/start`);
      return response.data;
    },
    onSuccess: (_, id) => {
      toast.success('Stock count started');
      queryClient.invalidateQueries(['stock-counts']);
      queryClient.invalidateQueries(['stock-counts', id]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to start stock count');
    }
  });
};

export const useUpdateStockCountItem = () => {
  return useMutation({
    mutationFn: async ({ countId, itemId, countedQty }) => {
      const response = await api.put(`/stock-counts/${countId}/items/${itemId}`, { countedQty });
      return response.data;
    },
    onSuccess: () => {
      // Typically we don't spam toast for every single item count, but we can if desired.
      // Let's omit it for rapid scanning, or maybe just a subtle success isn't bad.
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update count item');
    }
  });
};

export const useCompleteStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completedBy }) => {
      const response = await api.post(`/stock-counts/${id}/complete`, { completedBy });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Stock count completed successfully');
      queryClient.invalidateQueries(['stock-counts']);
      queryClient.invalidateQueries(['stock-counts', variables.id]);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['inventory']);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to complete stock count');
    }
  });
};
