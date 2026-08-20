import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDeadStock() {
  return useQuery({
    queryKey: ['reports', 'dead-stock'],
    queryFn: async () => {
      const response = await api.get('/reports/dead-stock');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
