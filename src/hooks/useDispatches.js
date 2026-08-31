import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useCreateDispatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return api.post('/dispatches', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', variables.salesOrderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};
