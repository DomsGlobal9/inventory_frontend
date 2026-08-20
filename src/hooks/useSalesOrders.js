import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:4006/api/v1/sales-orders';

export const useSalesOrders = (filters = {}) => {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      
      const res = await fetch(`${API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales orders');
      return res.json();
    }
  });
};

export const useSalesOrderDetails = (id) => {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`${API_URL}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order details');
      return res.json();
    },
    enabled: !!id
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create sales order');
      return res.json();
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
      const res = await fetch(`${API_URL}/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
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
      const res = await fetch(`${API_URL}/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
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
      const res = await fetch(`${API_URL}/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove item');
      }
      return res.json();
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
      const res = await fetch(`${API_URL}/${orderId}/confirm`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to confirm order');
      }
      return res.json();
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
      const res = await fetch(`${API_URL}/${orderId}/cancel`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel order');
      }
      return res.json();
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};
