import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews, optimisticRowPatch, restoreRows } from '../lib/invalidate';

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
    // The status pill changes the moment it is chosen. It is a single field on a row that is
    // already on screen, and the same value the refetch brings back -- so there is nothing to
    // guess. The derived figures below are a different matter and still wait for the server:
    // "money committed to orders" is money, and a number about money should never be a guess
    // that gets quietly corrected a second later.
    onMutate: ({ id, status }) => {
      const list = optimisticRowPatch(queryClient, ['purchase-orders'], po => po.id === id, { status });

      // The detail page reads its own key and holds ONE order, not a list, so the row patcher
      // above does not touch it -- and the detail page is exactly where this button lives.
      // Patching only the list meant the pill sat on DRAFT while the list behind it had
      // already moved on. Handled separately rather than by teaching the row patcher about
      // single objects, because "patch the object that IS the thing" and "find the row in a
      // list" are different jobs and conflating them makes both harder to reason about.
      const detailKey = ['purchase-orders', id];
      const previousDetail = queryClient.getQueryData(detailKey);
      if (previousDetail) {
        queryClient.setQueryData(detailKey, (old) => {
          if (!old) return old;
          if (old.data && typeof old.data === 'object' && !Array.isArray(old.data)) {
            return { ...old, data: { ...old.data, status } };
          }
          return { ...old, status };
        });
      }

      return { list, detailKey, previousDetail };
    },
    onError: (error, _vars, context) => {
      restoreRows(queryClient, context?.list);
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      toast.error(error?.message || 'Failed to update PO status');
    },
    onSuccess: (_, variables) => {
      toast.success('PO status updated');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
      // Marking a draft as SENT moves its value into "money committed to orders", which
      // counts SENT and PARTIALLY_RECEIVED, and into the day book's PO counts for the day.
      invalidateDerivedViews(queryClient);
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
    // Show the receipt on the order straight away.
    //
    // Measured: pressing Confirm Receipt left the line showing "received 0" and the order
    // showing SENT for longer than seven seconds, while the server had already taken the
    // stock in. Somebody watching that has no way to tell a slow save from a lost one, and
    // the natural response is to type the quantity again -- receiving the delivery twice.
    //
    // Only the two things that are actually KNOWN are filled in: how many more of each line
    // were received, and the status that follows arithmetically from it. Stock levels and
    // average cost are left to the server, because receiving at a new unit cost re-weights an
    // average and a guessed figure about money that gets corrected a second later is worse
    // than a figure that arrives a second late.
    onMutate: ({ id, receipts }) => {
      const detailKey = ['purchase-orders', id];
      const previousDetail = queryClient.getQueryData(detailKey);
      if (!previousDetail) return { detailKey, previousDetail };

      const byItem = new Map(
        (receipts || []).map(r => [r.poItemId, Number(r.quantityReceived) || 0])
      );

      const applyTo = (order) => {
        if (!order?.items) return order;
        const items = order.items.map(line => {
          const extra = byItem.get(line.id) || 0;
          if (!extra) return line;
          return { ...line, receivedQty: (Number(line.receivedQty) || 0) + extra };
        });
        // Fully received when every line has caught up with what was ordered; otherwise the
        // order is part-way there. Same rule the service applies, so the pill does not flip
        // twice when the real answer lands.
        const complete = items.every(
          line => (Number(line.receivedQty) || 0) >= (Number(line.orderedQty) || 0)
        );
        return { ...order, items, status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED' };
      };

      queryClient.setQueryData(detailKey, (old) => {
        if (!old) return old;
        if (old.data && typeof old.data === 'object' && !Array.isArray(old.data)) {
          return { ...old, data: applyTo(old.data) };
        }
        return applyTo(old);
      });

      return { detailKey, previousDetail };
    },
    onError: (error, _vars, context) => {
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      toast.error(error?.message || 'Failed to receive goods');
    },
    onSuccess: () => toast.success('Goods received successfully'),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      invalidateDerivedViews(queryClient); // Dashboard + reports + inventory rollups
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
