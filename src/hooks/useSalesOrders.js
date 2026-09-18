import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

// api.ts's interceptor rejects with the already-unwrapped response body, so the server's
// message lives at `error.message` -- NOT `error.response.data.message`, which is always
// undefined here and silently falls through to the generic fallback.
const showError = (fallback) => (error) => toast.error(error?.message || fallback);

/*
 * Put the server's answer on the open order at once.
 *
 * Invalidating alone left the page reading CONFIRMED, RESERVED 1 and offering Create Dispatch
 * for four or five seconds after "Order cancelled" -- the refetch of a whole order is several
 * round trips here. The confirm and cancel answers carry the order's new status, and what each
 * does to the reservations is fixed (confirm holds every line in full, cancel and close-short
 * release everything still held), so the page can show it now; the refetch then fills the rest.
 */
const patchOrder = (queryClient, orderId, answer, heldFor) => {
  if (!answer?.status) return;
  queryClient.setQueryData(['sales-orders', orderId], (old) => {
    if (!old || typeof old !== 'object' || !Array.isArray(old.items)) return old;
    return {
      ...old,
      status: answer.status,
      items: old.items.map(item => ({ ...item, heldQty: heldFor(item) }))
    };
  });
};

export const useSalesOrders = (filters = {}) => {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;

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
      // This endpoint creates the order CONFIRMED when asked to, and a confirmed order
      // reserves stock -- which changes what is available behind alerts and reorder
      // suggestions. (The plain draft endpoint above cannot, so it stays as it is.)
      invalidateDerivedViews(queryClient);
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
      invalidateDerivedViews(queryClient); // order totals feed the dashboard figures
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
      invalidateDerivedViews(queryClient); // order totals feed the dashboard figures
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
    onSuccess: (data, orderId) => {
      toast.success('Order confirmed. Stock is now reserved.');
      patchOrder(queryClient, orderId, data, (item) => Math.max(0, (Number(item.quantity) || 0) - (Number(item.fulfilledQty) || 0)));
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      invalidateDerivedViews(queryClient); // confirm/cancel moves reserved stock
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
    onSuccess: (data, orderId) => {
      // A part-sent order comes back DISPATCHED: its rest was closed, not cancelled.
      toast.success(data?.status === 'DISPATCHED' ? 'Order closed. The rest was released back to stock.' : 'Order cancelled. Reserved stock released.');
      patchOrder(queryClient, orderId, data, () => 0);
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      invalidateDerivedViews(queryClient); // confirm/cancel moves reserved stock
    },
    onError: showError('Could not cancel the order.')
  });
};
