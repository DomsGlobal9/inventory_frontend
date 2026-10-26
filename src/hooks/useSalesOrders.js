import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
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

/*
 * The Orders page: search, filters, counts and sort, fifty at a time (services/order-filters).
 * Under 'sales-orders' like the rest, so a confirm, cancel or payment anywhere refreshes it.
 */
export const useOrderSearch = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return useInfiniteQuery({
    queryKey: ['sales-orders', 'search', clean],
    queryFn: ({ pageParam }) => api.get('/sales-orders', { params: { ...clean, facets: '1', page: pageParam, limit: 50 } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last?.meta && last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    // Keep the list on screen while a new filter loads, rather than flashing to a spinner.
    placeholderData: keepPreviousData,
    // New orders from Shopify, the online shop and the till appear without a reload. Only while
    // just the first page is loaded -- re-reading five scrolled pages every 30 s is five slow
    // round trips -- and paused by React Query while the tab is in the background.
    refetchInterval: (query) => ((query.state.data?.pages?.length ?? 1) > 1 ? false : 30_000)
  });
};

/** Every order the filters match, as rows for a spreadsheet. */
export const fetchOrdersForExport = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return api.get('/sales-orders', { params: { ...clean, facets: '1', export: '1' } });
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

/** Money collected later (pay on delivery, an order typed in by hand), recorded against the order. */
export const useRecordPayment = (orderId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post(`/sales-orders/${orderId}/payments`, body),
    onSuccess: (res) => {
      const due = res?.data?.payment?.due ?? 0;
      toast.success(due > 0 ? `Payment recorded. ₹${due.toLocaleString('en-IN')} still due.` : 'Payment recorded. Nothing is due now.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      invalidateDerivedViews(queryClient); // the Day Book counts money in on the day it is recorded
    },
    onError: showError('The payment could not be recorded. Try again.')
  });
};

/** A payment recorded by mistake, cancelled with a reason (the owner only; services/order-payments). */
export const useUndoPayment = (orderId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }) => api.post(`/sales-orders/${orderId}/payments/${paymentId}/undo`, { reason }),
    onSuccess: (res) => {
      const due = res?.data?.payment?.due ?? 0;
      toast.success(`Payment undone. ₹${due.toLocaleString('en-IN')} is due again.`);
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      invalidateDerivedViews(queryClient); // today's Day Book nets it out
    },
    onError: showError('The payment could not be undone. Try again.')
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
