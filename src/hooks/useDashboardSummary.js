import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard-summary');
      if (!response?.data) {
        throw new Error('Invalid dashboard summary response');
      }
      return response.data;
    },
    staleTime: 60 * 1000 // 1 minute
  });
}
