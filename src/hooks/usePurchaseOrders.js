import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await api.get('/purchase-orders');
      return response.data;
    }
  });
};

export const usePurchaseOrder = (id) => {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: async () => {
      const response = await api.get(`/purchase-orders/${id}`);
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/purchase-orders', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Purchase Order created successfully');
      queryClient.invalidateQueries(['purchase-orders']);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create Purchase Order');
    }
  });
};

export const useUpdatePurchaseOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.put(`/purchase-orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('PO status updated');
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', variables.id]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update PO status');
    }
  });
};

export const useReceiveGoods = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, receipts }) => {
      const response = await api.post(`/purchase-orders/${id}/receive`, { receipts });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Goods received successfully');
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', variables.id]);
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to receive goods');
    }
  });
};
