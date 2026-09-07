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
