import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Stock that has not moved for `days` days. The threshold is a real filter -- the server
 * builds the date window from it -- so changing it changes the answer.
 */
export function useDeadStock(days = 90) {
  return useQuery({
    queryKey: ['reports', 'dead-stock', days],
    queryFn: async () => {
      const response = await api.get(`/reports/dead-stock?days=${days}`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
