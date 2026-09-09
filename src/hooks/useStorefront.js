import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * Storefront connections.
 *
 * The secret returned when a connection is created or rotated is the only copy that will ever
 * exist -- the server stores a hash -- so it is never written into the query cache. It is
 * handed straight back to the component that asked, shown once, and forgotten.
 */

export const useStorefrontConnections = () =>
  useQuery({
    queryKey: ['storefront', 'connections'],
    queryFn: async () => (await api.get('/storefront-connections')).data || [],
    staleTime: 30000
  });

export const useStorefrontDeliveries = (connectionId) =>
  useQuery({
    queryKey: ['storefront', 'deliveries', connectionId],
    queryFn: async () => (await api.get(`/storefront-connections/${connectionId}/deliveries`)).data || [],
    enabled: Boolean(connectionId),
    // Short, because this is the screen a merchant watches while debugging a connection.
    staleTime: 5000
  });

export const useCreateConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => (await api.post('/storefront-connections', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront', 'connections'] });
      // No toast here: the caller shows the secret, which is the real confirmation and needs
      // to stay on screen rather than compete with a notification that fades.
    },
    onError: (error) => toast.error(error?.message || 'Could not create the connection')
  });
};

export const useUpdateConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }) => (await api.patch(`/storefront-connections/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront', 'connections'] });
      toast.success('Connection updated');
    },
    onError: (error) => toast.error(error?.message || 'Could not update the connection')
  });
};

/** disable | enable | revoke */
export const useConnectionLifecycle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => (await api.post(`/storefront-connections/${id}/${action}`)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['storefront', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'deliveries', variables.id] });
      const said = { disable: 'Connection paused', enable: 'Connection re-enabled', revoke: 'Connection revoked' };
      toast.success(said[variables.action] || 'Updated');
    },
    onError: (error) => toast.error(error?.message || 'Could not update the connection')
  });
};

export const useRotateCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/storefront-connections/${id}/rotate`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storefront', 'connections'] }),
    onError: (error) => toast.error(error?.message || 'Could not issue a new key')
  });
};

/**
 * Sends a real event through the real pipeline and reports what happened. Slow by nature --
 * it waits for the merchant's own server to answer -- so the caller shows a pending state.
 */
export const useTestConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/storefront-connections/${id}/test`)).data,
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ['storefront', 'deliveries', id] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'connections'] });
      if (result?.delivered) {
        toast.success(`Your storefront answered in ${result.durationMs ?? '?'}ms.`);
      } else {
        // Deliberately an error, and deliberately verbose: a test that fails is the whole
        // reason the button exists, and "something went wrong" would leave the merchant with
        // nowhere to go.
        toast.error(
          `Your storefront did not accept the test${result?.responseStatus ? ` (HTTP ${result.responseStatus})` : ''}` +
          `${result?.error ? ` — ${result.error}` : ''}`,
          { duration: 12000 }
        );
      }
    },
    onError: (error) => toast.error(error?.message || 'Could not reach that address')
  });
};

export const useRetryDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliveryId }) =>
      (await api.post(`/storefront-connections/deliveries/${deliveryId}/retry`)).data,
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ['storefront', 'deliveries', variables.connectionId] });
      toast.success('Sending again');
    },
    onError: (error) => toast.error(error?.message || 'Could not retry that delivery')
  });
};
