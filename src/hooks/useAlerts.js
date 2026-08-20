import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useAlerts = () => {
  return useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const response = await api.get('/inventory/alerts');
      return response.data;
    }
  });
};
