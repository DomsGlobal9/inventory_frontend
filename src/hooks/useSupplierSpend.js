import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useSupplierSpend() {
  return useQuery({
    queryKey: ['reports', 'supplier-spend'],
    queryFn: async () => {
      const response = await api.get('/reports/supplier-spend');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}
