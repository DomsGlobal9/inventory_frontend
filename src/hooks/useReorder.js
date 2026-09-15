import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getStoredLocationId } from '../lib/api';

/**
 * Items below their reorder level, grouped by the supplier we would buy them from.
 *
 * Not cached for long: it is a live picture of what is running out, and acting on a stale
 * one means ordering something that was restocked ten minutes ago.
 */
export const useReorderSuggestions = () => {
  return useQuery({
    // Per store: the server works the suggestions out for the store selected at the top.
    queryKey: ['reorder-suggestions', getStoredLocationId()],
    queryFn: async () => (await api.get('/reorder/suggestions')).data,
    staleTime: 30000
  });
};

export const useCreateReorderDrafts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // The store the suggestions were for, so the drafts are delivered where the stock ran out.
    mutationFn: async ({ groups, locationId }) => (await api.post('/reorder/draft-orders', { groups, locationId })).data,
    onSuccess: () => {
      // The suggestions themselves do not change (stock has not moved yet), but the orders
      // list has, and leaving it stale hides the drafts the user was just told about.
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
    onError: (error) => toast.error(error?.message || 'Could not create the purchase orders')
  });
};
