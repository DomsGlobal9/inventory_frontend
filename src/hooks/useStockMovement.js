import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useStockMovement(days = 30) {
  return useQuery({
    queryKey: ['reports', 'stock-movement', days],
    queryFn: async () => {
      const response = await api.get(`/reports/stock-movement?days=${days}`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}
