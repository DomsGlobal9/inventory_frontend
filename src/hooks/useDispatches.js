import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useCreateDispatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return api.post('/dispatches', data);
    },
    onSuccess: (_, variables) => {
      toast.success('Dispatch created. Stock has been shipped out.');
      queryClient.invalidateQueries({ queryKey: ['sales-orders', variables.salesOrderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    // e.g. "Cannot dispatch 5. Only 2 reserved remaining." from dispatchReservation --
    // api.ts already unwrapped the body, so the message is on `error` itself.
    onError: (error) => toast.error(error?.message || 'Could not create the dispatch.')
  });
};
