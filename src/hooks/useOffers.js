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
    enabled: !!id
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
