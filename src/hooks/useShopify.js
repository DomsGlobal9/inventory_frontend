import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * Connecting a Shopify store.
 *
 * The shape here is unlike every other mutation in the app, and deliberately: the success path
 * LEAVES the application. Shopify's grant screen has to be reached by a real browser navigation
 * on the merchant's own tab, because that is where they are asked to approve the scopes and
 * where their Shopify session lives. A fetch cannot do it -- following that redirect from an
 * XHR lands the response in JavaScript instead of in front of the person who has to say yes.
 *
 * So the server returns the URL and the browser is sent there.
 */

/** What this workspace currently has connected, if anything. */
export const useShopifyStatus = () =>
  useQuery({
    queryKey: ['shopify', 'status'],
    queryFn: async () => (await api.get('/shopify-connect/status')).data ?? null,
    staleTime: 30_000
  });

/**
 * Installations that arrived from Shopify's side and belong to nobody yet.
 *
 * Only the shop domain and install time are returned -- enough to recognise your own store and
 * nothing about anyone's catalogue or stock.
 */
export const usePendingShopifyInstalls = () =>
  useQuery({
    queryKey: ['shopify', 'pending'],
    queryFn: async () => (await api.get('/shopify-connect/pending')).data ?? [],
    staleTime: 30_000
  });

export const useConnectShopify = () =>
  useMutation({
    mutationFn: async (shop) => (await api.post('/shopify-connect/install', { shop })).data,
    onSuccess: (result) => {
      if (!result?.authorizeUrl) {
        toast.error('Could not start the Shopify connection.');
        return;
      }
      // Not a router navigation: this leaves the app entirely, for Shopify's own domain.
      window.location.href = result.authorizeUrl;
    },
    onError: (error) => toast.error(error?.message || 'Could not reach Shopify.')
  });

/**
 * Claims a store that installed from Shopify's side.
 *
 * The merchant confirms the shop domain first. That confirmation is the whole safeguard --
 * claiming binds a store to this workspace, and the wrong one would publish this tenant's
 * inventory to somebody else's website.
 */
export const useClaimShopify = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shop) => (await api.post('/shopify-connect/claim', { shop })).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shopify'] });
      toast.success(`${result?.shopDomain ?? 'That store'} is now connected to this workspace.`);
    },
    onError: (error) => toast.error(error?.message || 'Could not claim that store.')
  });
};

// ── Setting the store up, and the orders waiting on it ─────────────────────────────────────────

/**
 * What an automatic retry achieved, said at the moment the merchant caused it.
 *
 * Pairing a location or matching products retries every waiting order on the server. The screen
 * says so in the same breath -- "2 waiting orders were placed" -- because otherwise the inbox
 * below quietly empties and nobody connects the cause with the effect.
 */
const announceReplay = (replay) => {
  if (!replay) return;
  if (replay.placed > 0) {
    toast.success(`${replay.placed} waiting Shopify order${replay.placed === 1 ? ' was' : 's were'} placed.`);
  } else if (replay.stillWaiting > 0) {
    toast(`${replay.stillWaiting} Shopify order${replay.stillWaiting === 1 ? ' is' : 's are'} still waiting on something else.`, { icon: '⏳' });
  }
};

const refreshShopify = (queryClient) => queryClient.invalidateQueries({ queryKey: ['shopify'] });

/** The store's locations beside ours. Asks Shopify, so it is only fetched when opened. */
export const useShopifyLocations = (enabled) =>
  useQuery({
    queryKey: ['shopify', 'locations'],
    queryFn: async () => (await api.get('/shopify-connect/locations')).data,
    enabled,
    staleTime: 60_000,
    retry: false
  });

export const usePairShopifyLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shopifyLocationId, locationId }) =>
      (await api.put(`/shopify-connect/locations/${shopifyLocationId}`, { locationId })).data,
    onSuccess: (result) => {
      refreshShopify(queryClient);
      if (result?.paired) toast.success(`${result.paired.shopifyName} is paired with ${result.paired.locationName}.`);
      else toast.success('Unpaired.');
      announceReplay(result?.replay);
    },
    onError: (error) => toast.error(error?.message || 'Could not pair that location.')
  });
};

export const useShopifyProductSummary = (enabled) =>
  useQuery({
    queryKey: ['shopify', 'products', 'summary'],
    queryFn: async () => (await api.get('/shopify-connect/products/summary')).data,
    enabled,
    staleTime: 30_000
  });

export const useMatchShopifyProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/shopify-connect/products/match')).data,
    onSuccess: (result) => {
      refreshShopify(queryClient);
      toast.success(
        result?.newlyMatched > 0
          ? `${result.newlyMatched} product${result.newlyMatched === 1 ? '' : 's'} newly matched.`
          : 'Nothing new to match.'
      );
      announceReplay(result?.replay);
    },
    onError: (error) => toast.error(error?.message || 'Could not match your Shopify products.')
  });
};

export const useShopifyInbox = (state = 'open', enabled = true) =>
  useQuery({
    queryKey: ['shopify', 'inbox', state],
    queryFn: async () => (await api.get('/shopify-connect/inbox', { params: { state } })).data,
    enabled,
    staleTime: 15_000
  });

export const useReplayShopifyOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/shopify-connect/inbox/${id}/replay`)).data,
    onSuccess: (result) => {
      refreshShopify(queryClient);
      if (result?.status === 'WAITING') {
        toast(`Still waiting: ${result.detail}`, { icon: '⏳', duration: 8000 });
      } else {
        toast.success(`Placed as ${result?.orderNumber}.`);
      }
    },
    onError: (error) => toast.error(error?.message || 'Could not retry that order.')
  });
};

export const useReplayAllShopifyOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/shopify-connect/inbox/replay-all')).data,
    onSuccess: (result) => {
      refreshShopify(queryClient);
      if (!result?.placed && !result?.stillWaiting) toast('Nothing was waiting.');
      else announceReplay(result);
    },
    onError: (error) => toast.error(error?.message || 'Could not retry the waiting orders.')
  });
};

export const useDismissShopifyOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await api.post(`/shopify-connect/inbox/${id}/dismiss`, { reason })).data,
    onSuccess: () => {
      refreshShopify(queryClient);
      toast.success('Dismissed. The reason is kept with it.');
    },
    onError: (error) => toast.error(error?.message || 'Could not dismiss that order.')
  });
};
