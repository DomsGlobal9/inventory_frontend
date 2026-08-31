import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useSalesOrders = (filters = {}) => {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      const params = {};
      if (filters.status) params.status = filters.status;

      return api.get('/sales-orders', { params });
    }
  });
};

export const useSalesOrderDetails = (id) => {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: async () => {
      if (!id) return null;
      return api.get(`/sales-orders/${id}`);
    },
    enabled: !!id
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return api.post('/sales-orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};

export const useCreateFullOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return api.post('/sales-orders/full', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};

export const useAddOrderItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }) => {
      return api.post(`/sales-orders/${orderId}/items`, data);
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};

export const useRemoveOrderItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      return api.delete(`/sales-orders/${orderId}/items/${itemId}`);
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};

export const useConfirmOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId) => {
      return api.post(`/sales-orders/${orderId}/confirm`);
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId) => {
      return api.post(`/sales-orders/${orderId}/cancel`);
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};
