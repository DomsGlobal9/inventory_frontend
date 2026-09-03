import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

// api.ts's interceptor rejects with the already-unwrapped response body, so the server's
// message lives at `error.message` -- NOT `error.response.data.message`, which is always
// undefined here and silently falls through to the generic fallback.
const showError = (fallback) => (error) => toast.error(error?.message || fallback);

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
    },
    onError: showError('Could not create the order.')
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
    },
    onError: showError('Could not create the order.')
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
    },
    onError: showError('Could not add the item to this order.')
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
    },
    onError: showError('Could not remove the item.')
  });
};

export const useConfirmOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId) => {
      return api.post(`/sales-orders/${orderId}/confirm`);
    },
    onSuccess: (_, orderId) => {
      toast.success('Order confirmed. Stock is now reserved.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    // The common failure here is "Insufficient stock for variant X. Requested: 5,
    // Available: 2" thrown by reserveStock -- exactly the message the warehouse user
    // needs. Before this it was swallowed and the button just appeared to do nothing.
    onError: showError('Could not confirm the order.')
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId) => {
      return api.post(`/sales-orders/${orderId}/cancel`);
    },
    onSuccess: (_, orderId) => {
      toast.success('Order cancelled. Reserved stock released.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    onError: showError('Could not cancel the order.')
  });
};
