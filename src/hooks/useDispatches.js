import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api/v1/dispatches';

export const useCreateDispatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create dispatch');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', variables.salesOrderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    }
  });
};
