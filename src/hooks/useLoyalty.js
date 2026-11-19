import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * A customer's yes to WhatsApp offers, and loyalty points. What a points payment may be is decided on the
 * server; these hooks only carry requests.
 */

const LOYALTY = ['loyalty'];

// ── A customer's yes to offers ──────────────────────────────────────────────────────────────

export const useOffersConsent = (customerId) => useQuery({
  queryKey: ['offers-consent', customerId],
  queryFn: async () => (await api.get(`/offers-consent/${customerId}`)).data,
  enabled: !!customerId
});

export const useSetOffersConsent = (customerId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agreed) => (await api.put(`/offers-consent/${customerId}`, { agreed })).data,
    onSuccess: (data) => qc.setQueryData(['offers-consent', customerId], data),
  });
};

// ── Loyalty points ──────────────────────────────────────────────────────────────────────────

export const useLoyaltySettings = ({ enabled = true } = {}) => useQuery({
  queryKey: ['loyalty', 'settings'],
  queryFn: async () => (await api.get('/loyalty/settings')).data,
  enabled,
  staleTime: 60_000
});

export const useSaveLoyaltySettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.put('/loyalty/settings', body)).data,
    onSuccess: (data) => qc.setQueryData(['loyalty', 'settings'], data),
    onSettled: () => qc.invalidateQueries({ queryKey: LOYALTY })
  });
};

export const useCustomerPoints = (customerId) => useQuery({
  queryKey: ['loyalty', 'customer', customerId],
  queryFn: async () => (await api.get(`/loyalty/customers/${customerId}`)).data,
  enabled: !!customerId
});

export const useAdjustPoints = (customerId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post(`/loyalty/customers/${customerId}/adjust`, body)).data,
    onSuccess: (data) => qc.setQueryData(['loyalty', 'customer', customerId], data)
  });
};

/** The New sale screen: this customer's points, and how many may pay part of this bill. */
export const useCounterPoints = (customerId, bill) => useQuery({
  queryKey: ['loyalty', 'counter', customerId ?? 'none', bill ?? 0],
  queryFn: async () => (await api.get('/loyalty/counter', { params: { customerId, bill } })).data,
  enabled: !!customerId,
  staleTime: 5_000
});
