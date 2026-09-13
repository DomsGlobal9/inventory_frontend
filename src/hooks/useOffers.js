import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

// api's interceptor rejects with the already-unwrapped response body, so the server's sentence
// lives at `error.message` -- NOT `error.response.data.message`, which is always undefined here
// and falls silently through to the generic fallback. Offers lean on this: almost every refusal
// is something the merchant typed, and the server has already said so in words they can act on.
const showError = (fallback) => (error) => toast.error(error?.message || fallback);

// The interceptor returns the WRAPPER -- { success, data, meta } -- not the payload, because
// some endpoints carry pagination in `meta`. The offers routes answer in that shape, so the
// payload has to be taken out here. Returning the wrapper instead is how a page ends up calling
// .map on an object and rendering nothing but an error boundary.
const payload = (res) => res?.data ?? res;

export const useOffers = (filters = {}) =>
  useQuery({
    queryKey: ['offers', filters],
    queryFn: () => {
      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.search) params.search = filters.search;
      return api.get('/offers', { params }).then(payload);
    }
  });

export const useOffer = (id) =>
  useQuery({
    queryKey: ['offers', 'detail', id],
    queryFn: () => (id ? api.get(`/offers/${id}`).then(payload) : null),
    enabled: !!id,
    // Once, not the default three with backoff: an offer that was deleted otherwise leaves the page
    // on "Loading" for seven seconds before it says so.
    retry: 1
  });

/** What an offer can be aimed at in this shop. Changes rarely, so it is kept for a few minutes. */
export const useOfferOptions = (enabled = true) =>
  useQuery({
    queryKey: ['offers', 'options'],
    queryFn: () => api.get('/offers/options').then(payload),
    staleTime: 5 * 60 * 1000,
    enabled
  });

/** Products or SKUs matching what was typed, for the picker. */
export const useOfferTargetSearch = (scope, q) =>
  useQuery({
    queryKey: ['offers', 'targets', scope, q],
    queryFn: () => api.get('/offers/targets', { params: { scope, q } }).then(payload),
    enabled: scope === 'PRODUCT' || scope === 'VARIANT',
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous
  });

/** Both the list and the open offer, because starting one changes what the list says about it. */
const refresh = (queryClient, id) => {
  queryClient.invalidateQueries({ queryKey: ['offers'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['offers', 'detail', id] });
};

export const useCreateOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/offers', data).then(payload),
    onSuccess: () => {
      refresh(queryClient);
      toast.success('Offer saved as a draft. Start it when you are ready.');
    },
    onError: showError('Could not save that offer.')
  });
};

export const useUpdateOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/offers/${id}`, data).then(payload),
    onSuccess: (_r, vars) => {
      refresh(queryClient, vars.id);
      toast.success('Offer updated.');
    },
    onError: showError('Could not save that offer.')
  });
};

export const useSetOfferStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.post(`/offers/${id}/status`, { status }).then(payload),
    onSuccess: (_r, vars) => {
      refresh(queryClient, vars.id);
      toast.success(
        vars.status === 'ACTIVE' ? 'Offer is running.'
          : vars.status === 'PAUSED' ? 'Offer paused.'
          : 'Offer retired.'
      );
    },
    onError: showError('Could not change that offer.')
  });
};

/** A draft copy of an offer. The caller decides where to go with it. */
export const useDuplicateOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/offers/${id}/duplicate`).then(payload),
    onSuccess: () => {
      refresh(queryClient);
      toast.success('Copied as a draft. Check the dates, then start it.');
    },
    onError: showError('Could not copy that offer.')
  });
};

// ── Single-use codes ───────────────────────────────────────────────────────────────────────────

export const useOfferCodes = (id, { status, q, skip = 0, take = 50 } = {}, enabled = true) =>
  useQuery({
    queryKey: ['offers', 'codes', id, status, q, skip, take],
    queryFn: () => api.get(`/offers/${id}/codes`, { params: { status, q: q || undefined, skip, take } }).then(payload),
    enabled: !!id && enabled,
    placeholderData: (previous) => previous
  });

/** Every code, for copying or saving as a file. Asked for when needed, never kept. */
export const fetchAllOfferCodes = (id, status) =>
  api.get(`/offers/${id}/codes`, { params: { all: 1, status } }).then(payload);

export const useMakeOfferCodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prefix, count }) => api.post(`/offers/${id}/codes`, { prefix, count }).then(payload),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'codes', vars.id] });
      refresh(queryClient, vars.id);
      toast.success(`${data.made} code${data.made === 1 ? '' : 's'} made.`);
    },
    onError: showError('Could not make the codes.')
  });
};

// ── Till rules ─────────────────────────────────────────────────────────────────────────────────

export const useOfferSettings = () =>
  useQuery({ queryKey: ['offers', 'settings'], queryFn: () => api.get('/offers/settings').then(payload) });

export const useSaveOfferSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put('/offers/settings', data).then(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['offers', 'settings'], data);
      toast.success(data.manualDiscountMaxPercent == null ? 'No limit on discounts by hand.' : `The till may now take off up to ${data.manualDiscountMaxPercent}% by hand.`);
    },
    onError: showError('Could not save the till rules.')
  });
};

// ── Shopify ─────────────────────────────────────────────────────────────────────────────────────

/**
 * An offer's copy on the connected Shopify store.
 *
 * Polled while work is in flight. A push happens in the background -- the worker picks it up within
 * about thirty seconds -- so without polling the panel would say "Sending to Shopify" until somebody
 * closed and reopened it.
 */
export const useOfferShopify = (id, enabled = true) =>
  useQuery({
    queryKey: ['offers', 'shopify', id],
    queryFn: () => api.get(`/offers/${id}/shopify`).then(payload),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.mirror?.status;
      return status === 'PENDING' || status === 'REMOVING' ? 5000 : false;
    }
  });

const shopifyAction = (method, suffix, success) => () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api[method](`/offers/${id}/shopify${suffix}`).then(payload),
    onSuccess: (data, id) => {
      queryClient.setQueryData(['offers', 'shopify', id], data);
      refresh(queryClient, id);
      toast.success(success);
    },
    onError: showError('Shopify could not be updated.')
  });
};

export const usePutOfferOnShopify = shopifyAction('post', '', 'Sending this offer to Shopify.');
export const useTakeOfferOffShopify = shopifyAction('delete', '', 'Taking this offer off Shopify.');
export const usePushOfferToShopify = shopifyAction('post', '/push', 'Sending this offer\'s version to Shopify.');
export const useAcceptShopifyVersion = shopifyAction('post', '/accept', 'The offer now matches Shopify.');
