import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useSnapshots(days = 30) {
  return useQuery({
    queryKey: ['reports', 'snapshots', days],
    queryFn: async () => {
      const response = await api.get(`/reports/snapshots?days=${days}`);
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}
