import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ['reports', 'recent-transactions', limit],
    queryFn: async () => {
      const response = await api.get(`/reports/recent-transactions?limit=${limit}`);
      return response.data || [];
    },
    staleTime: 15 * 1000 // 15 seconds
  });
}
