import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useAlerts = () => {
  return useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const response = await api.get('/inventory/alerts');
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds for new alerts
  });
};

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/inventory/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts'] }),
  });
};

export const useMarkAllAlertsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/inventory/alerts/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts'] }),
  });
};

export const useTogglePinAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/inventory/alerts/${id}/pin`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts'] }),
  });
};

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/inventory/alerts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'alerts'] }),
  });
};
