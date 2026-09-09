import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

export const useCreateDispatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return api.post('/dispatches', data);
    },
    // Show the shipment on the order straight away.
    //
    // Measured on the running app: dispatching one of two took over twelve seconds to appear,
    // during which the line still read "reserved 2, dispatched 0" and the order still read
    // CONFIRMED. The server had already taken the stock out and written the OUT/SALE ledger
    // entry. Twelve seconds of a screen insisting nothing happened is how the same goods get
    // dispatched twice.
    //
    // Only what is known is filled in: how many more of each line went out, and the status
    // that follows from it. Stock levels and revenue are left to the server -- a dispatch
    // recognises revenue, and a figure about money that has to be corrected a moment later is
    // worse than one that arrives a moment late.
    onMutate: ({ salesOrderId, items }) => {
      const detailKey = ['sales-orders', salesOrderId];
      const previousDetail = queryClient.getQueryData(detailKey);
      if (!previousDetail) return { detailKey, previousDetail };

      const byLine = new Map((items || []).map(i => [i.salesOrderItemId, Number(i.quantity) || 0]));

      const applyTo = (order) => {
        if (!order?.items) return order;
        const lines = order.items.map(line => {
          const shipped = byLine.get(line.id) || 0;
          if (!shipped) return line;
          // fulfilledQty is what the page renders BOTH columns from: dispatched directly, and
          // reserved as quantity minus this. One field, both numbers.
          return { ...line, fulfilledQty: (Number(line.fulfilledQty) || 0) + shipped };
        });
        const allOut = lines.every(
          line => (Number(line.fulfilledQty) || 0) >= (Number(line.quantity) || 0)
        );
        return { ...order, items: lines, status: allOut ? 'DISPATCHED' : 'PARTIALLY_DISPATCHED' };
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
    // e.g. "Cannot dispatch 5. Only 2 reserved remaining." from dispatchReservation --
    // api.ts already unwrapped the body, so the message is on `error` itself.
    onError: (error, _vars, context) => {
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      toast.error(error?.message || 'Could not create the dispatch.');
    },
    onSuccess: () => toast.success('Dispatch created. Stock has been shipped out.'),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', variables.salesOrderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      invalidateDerivedViews(queryClient); // dispatch reduces physical stock
    }
  });
};
