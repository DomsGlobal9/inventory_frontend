import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

/**
 * Returns at the counter, and store credit. What may be taken back, what it comes to and who may
 * do it are the server's; these only carry requests.
 */

export const useReturnRules = ({ enabled = true } = {}) => useQuery({
  queryKey: ['counter-returns', 'rules'],
  queryFn: async () => (await api.get('/counter-returns/rules')).data,
  enabled,
  staleTime: 60_000
});

export const useSaveReturnRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.put('/counter-returns/rules', body)).data,
    onSuccess: (data) => qc.setQueryData(['counter-returns', 'rules'], data)
  });
};

export const useFindSales = (q) => useQuery({
  queryKey: ['counter-returns', 'find', q],
  queryFn: async () => (await api.get('/counter-returns/find', { params: { q } })).data,
  enabled: (q ?? '').trim().length >= 2,
  staleTime: 5_000,
  retry: false
});

export const useSaleForReturn = (orderId) => useQuery({
  queryKey: ['counter-returns', 'sale', orderId],
  queryFn: async () => (await api.get(`/counter-returns/sale/${orderId}`)).data,
  enabled: !!orderId,
  retry: false
});

export const useReturnPreview = (orderId, lines) => useQuery({
  queryKey: ['counter-returns', 'preview', orderId, JSON.stringify(lines)],
  queryFn: async () => (await api.post('/counter-returns/preview', { orderId, lines })).data,
  enabled: !!orderId && lines.length > 0,
  retry: false,
  staleTime: 5_000
});

export const useCompleteCounterReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post('/counter-returns', body)).data,
    onSettled: () => {
      // Not the preview: asked again for pieces that have just come back, it answers "already come
      // back" and the app shows that as an error over the finished return.
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'counter-returns' && q.queryKey[1] !== 'preview' });
      qc.removeQueries({ queryKey: ['counter-returns', 'preview'] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['store-credit'] });
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      invalidateDerivedViews(qc);
    }
  });
};

export const useRecordRefund = (returnId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post(`/counter-returns/refund/${returnId}`, body)).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['return', returnId] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['store-credit'] });
    }
  });
};

// ── Store credit ────────────────────────────────────────────────────────────────────────────

export const useStoreCredit = (customerId) => useQuery({
  queryKey: ['store-credit', 'customer', customerId],
  queryFn: async () => (await api.get(`/counter-returns/credit/customers/${customerId}`)).data,
  enabled: !!customerId
});

export const useCounterCredit = (customerId) => useQuery({
  queryKey: ['store-credit', 'counter', customerId ?? 'none'],
  queryFn: async () => (await api.get('/counter-returns/credit/counter', { params: { customerId } })).data,
  enabled: !!customerId,
  staleTime: 5_000
});

export const usePayOutCredit = (customerId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post(`/counter-returns/credit/customers/${customerId}/payout`, body)).data,
    onSuccess: (data) => qc.setQueryData(['store-credit', 'customer', customerId], data)
  });
};
