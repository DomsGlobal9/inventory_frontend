import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * WhatsApp campaigns and loyalty points. Who a campaign may reach, how fast it goes and what a
 * points payment may be are all decided on the server; these hooks only carry requests.
 */

const CAMPAIGNS = ['campaigns'];
const LOYALTY = ['loyalty'];

export const useCampaignOverview = ({ enabled = true } = {}) => useQuery({
  queryKey: ['campaigns', 'overview'],
  queryFn: async () => (await api.get('/campaigns/overview')).data,
  enabled,
  staleTime: 30_000
});

export const useCampaigns = (source = 'MANUAL') => useQuery({
  queryKey: ['campaigns', 'list', source],
  queryFn: async () => (await api.get('/campaigns', { params: source === 'AUTO' ? { source: 'AUTO' } : {} })).data,
  // A sending campaign's numbers move as WhatsApp's ticks arrive.
  refetchInterval: (q) => ((q.state.data ?? []).some(c => c.status === 'SENDING') ? 20_000 : false)
});

export const useCampaign = (id) => useQuery({
  queryKey: ['campaigns', 'one', id],
  queryFn: async () => (await api.get(`/campaigns/${id}`)).data,
  enabled: !!id,
  refetchInterval: (q) => (q.state.data?.status === 'SENDING' ? 15_000 : false)
});

/** How many a set of choices reaches right now. */
export const useAudiencePreview = (audience, { enabled = true } = {}) => useQuery({
  queryKey: ['campaigns', 'preview', JSON.stringify(audience ?? {})],
  queryFn: async () => (await api.post('/campaigns/preview', { audience })).data,
  enabled,
  staleTime: 10_000,
  retry: false
});

const campaignMutation = (fn) => () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: CAMPAIGNS })
  });
};

export const useCreateCampaign = campaignMutation(async (body) => (await api.post('/campaigns', body)).data);
export const useUpdateCampaign = campaignMutation(async ({ id, ...body }) => (await api.patch(`/campaigns/${id}`, body)).data);
export const useDeleteCampaign = campaignMutation(async (id) => (await api.delete(`/campaigns/${id}`)).data);
export const useCopyCampaign = campaignMutation(async (id) => (await api.post(`/campaigns/${id}/copy`)).data);
export const useStartCampaign = campaignMutation(async ({ id, expected }) => (await api.post(`/campaigns/${id}/start`, { expected })).data);
export const useCampaignAction = campaignMutation(async ({ id, action }) => (await api.post(`/campaigns/${id}/${action}`)).data);
export const useSendCampaignTest = () => useMutation({
  mutationFn: async (body) => (await api.post('/campaigns/test', body)).data
});

/** Every link of a started campaign off (a wrong page, a wrong price) or on again. */
export const useCampaignLinks = campaignMutation(async ({ id, on }) => (await api.post(`/campaigns/${id}/links/${on ? 'on' : 'off'}`)).data);

// ── Pictures ────────────────────────────────────────────────────────────────────────────────

/** A photo from this device. The server makes the WhatsApp-ready copy and answers with it. */
export const useUploadCampaignPicture = () => useMutation({
  mutationFn: async (dataUrl) => (await api.post('/campaigns/media', { base64: dataUrl }, { timeout: 120_000 })).data
});

export const usePictureFromProduct = () => useMutation({
  mutationFn: async (productImageId) => (await api.post('/campaigns/media/from-product', { productImageId }, { timeout: 60_000 })).data
});

export const useProductPhotos = (q, { enabled = true } = {}) => useQuery({
  queryKey: ['campaigns', 'product-photos', q ?? ''],
  queryFn: async () => (await api.get('/campaigns/product-photos', { params: q ? { q } : {} })).data,
  enabled,
  staleTime: 30_000
});

// ── Templates ───────────────────────────────────────────────────────────────────────────────

export const useCampaignTemplates = ({ enabled = true } = {}) => useQuery({
  queryKey: ['campaigns', 'templates'],
  queryFn: async () => (await api.get('/campaigns/templates')).data,
  enabled,
  staleTime: 30_000
});
export const useSaveTemplate = campaignMutation(async (body) => (await api.post('/campaigns/templates', body)).data);
export const useDeleteTemplate = campaignMutation(async (id) => (await api.delete(`/campaigns/templates/${encodeURIComponent(id)}`)).data);

// ── A customer's yes to offers ──────────────────────────────────────────────────────────────

export const useOffersConsent = (customerId) => useQuery({
  queryKey: ['campaigns', 'consent', customerId],
  queryFn: async () => (await api.get(`/campaigns/consent/${customerId}`)).data,
  enabled: !!customerId
});

export const useSetOffersConsent = (customerId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agreed) => (await api.put(`/campaigns/consent/${customerId}`, { agreed })).data,
    onSuccess: (data) => qc.setQueryData(['campaigns', 'consent', customerId], data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['campaigns', 'overview'] })
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
