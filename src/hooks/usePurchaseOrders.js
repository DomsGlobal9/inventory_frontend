import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create Purchase Order');
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
      // Marking a draft as SENT moves its value into "money committed to orders", which
      // counts SENT and PARTIALLY_RECEIVED, and into the day book's PO counts for the day.
      invalidateDerivedViews(queryClient);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update PO status');
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      invalidateDerivedViews(queryClient); // Dashboard + reports + inventory rollups
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to receive goods');
    }
  });
};

export const useEmailPurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await api.post(`/purchase-orders/${id}/email`);
      return response;
    },
    onSuccess: (response, variables) => {
      toast.success(response?.message || 'Order emailed to the supplier');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
      // Sending a Draft moves it to SENT, which is the same set of derived views a manual
      // "Mark as Sent" moves: money committed to orders, and the day book's PO counts.
      invalidateDerivedViews(queryClient);
    },
    onError: (error) => {
      // The backend says exactly what is wrong -- no supplier email, no items, mail not
      // configured -- and those are all things the merchant can act on, so show them rather
      // than a generic failure.
      toast.error(error?.message || 'Could not email the order');
    }
  });
};
