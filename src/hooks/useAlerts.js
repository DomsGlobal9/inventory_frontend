import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { optimisticRowPatch, restoreRows } from '../lib/invalidate';
import { usePermission } from './usePermission';

export const useAlerts = () => {
  // Stock alerts are for people who can see stock. The bell in the top bar is on every page for
  // everyone, and for a salesperson it asked every 10 seconds and was refused every time -- a 403
  // in the console on every page, and a request a minute and more counted against the rate limit.
  const { can } = usePermission();
  const allowed = can('inventory:view');
  return useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const response = await api.get('/inventory/alerts');
      return response.data;
    },
    enabled: allowed,
    refetchInterval: allowed ? 10000 : false, // Poll every 10 seconds for new alerts
  });
};

/**
 * The alert list is worked through by clicking: read, pin, dismiss, one after another.
 *
 * All four of these used to fire and wait, so each click sat there for a round trip -- and
 * none of them had an onError, so a refusal changed nothing on screen and said nothing. The
 * only difference between "still working" and "quietly failed" was patience.
 *
 * Read and pin are patches to a row that already exists, so they apply immediately.
 * Dismissing removes a row and changes the unread count, so it waits for the server: getting
 * a disappearance wrong means an alert that comes back, which is worse than a moment's delay.
 */
const ALERTS_KEY = ['inventory', 'alerts'];

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/inventory/alerts/${id}/read`),
    onMutate: (id) => optimisticRowPatch(queryClient, ALERTS_KEY, a => a.id === id, { isRead: true, read: true }),
    onError: (error, _id, context) => {
      restoreRows(queryClient, context);
      toast.error(error?.message || 'Could not mark that as read');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
};

export const useMarkAllAlertsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/inventory/alerts/read-all'),
    onMutate: () => optimisticRowPatch(queryClient, ALERTS_KEY, () => true, { isRead: true, read: true }),
    onError: (error, _v, context) => {
      restoreRows(queryClient, context);
      toast.error(error?.message || 'Could not mark those as read');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
};

export const useTogglePinAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/inventory/alerts/${id}/pin`),
    // Read the current value and flip it, rather than assuming a direction -- this is a
    // toggle, and the same call is both pin and unpin.
    onMutate: (id) => {
      const current = queryClient.getQueryData(ALERTS_KEY);
      const list = current?.alerts || current?.data || [];
      const row = Array.isArray(list) ? list.find(a => a.id === id) : null;
      const next = !(row?.isPinned ?? row?.pinned ?? false);
      return optimisticRowPatch(queryClient, ALERTS_KEY, a => a.id === id, { isPinned: next, pinned: next });
    },
    onError: (error, _id, context) => {
      restoreRows(queryClient, context);
      toast.error(error?.message || 'Could not pin that');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
};

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/inventory/alerts/${id}`),
    onError: (error) => toast.error(error?.message || 'Could not dismiss that alert'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
};
