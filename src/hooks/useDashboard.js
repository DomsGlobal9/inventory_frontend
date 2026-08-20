import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    }
  });
}
