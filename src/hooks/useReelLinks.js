import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Reel links (PLAN-reel-links.md): the pieces from one Instagram reel, behind one link. Every rule is on the server;
 * these hooks only carry requests.
 */

export const useReelOverview = ({ enabled = true } = {}) => useQuery({
  queryKey: ['reel-links', 'overview'],
  queryFn: async () => (await api.get('/reel-links/overview')).data,
  enabled, staleTime: 60_000
});

export const useReelLinks = ({ enabled = true } = {}) => useQuery({
  queryKey: ['reel-links', 'list'],
  queryFn: async () => (await api.get('/reel-links')).data,
  enabled
});

export const useReelLink = (id) => useQuery({
  queryKey: ['reel-links', 'one', id],
  queryFn: async () => (await api.get(`/reel-links/${id}`)).data,
  enabled: !!id
});

export const useNextReelTitle = ({ enabled = true } = {}) => useQuery({
  queryKey: ['reel-links', 'next-title'],
  queryFn: async () => (await api.get('/reel-links/next-title')).data,
  enabled, staleTime: 0, gcTime: 0
});

/** Pieces to add, by name, code or SKU; the newest changed first when the box is empty. filter: 'new' | 'instock'. */
export const usePieceSearch = (q, { enabled = true, filter = null } = {}) => useQuery({
  queryKey: ['reel-links', 'pieces', q, filter],
  queryFn: async () => (await api.get('/reel-links/pieces', { params: { q, ...(filter ? { filter } : {}) } })).data,
  enabled, staleTime: 15_000, placeholderData: (prev) => prev
});

function useReelMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reel-links', 'list'] });
      if (data?.id) qc.setQueryData(['reel-links', 'one', data.id], data);
    }
  });
}

export const useCreateReelLink = () => useReelMutation(async (body) => (await api.post('/reel-links', body)).data);
export const useUpdateReelLink = (id) => useReelMutation(async (body) => (await api.put(`/reel-links/${id}`, body)).data);
export const useSwitchReelLink = (id) => useReelMutation(async (on) => (await api.post(`/reel-links/${id}/${on ? 'on' : 'off'}`)).data);
export const useAddToReelLink = () => useReelMutation(async (body) => (await api.post('/reel-links/add', body)).data);

export function useDeleteReelLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/reel-links/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reel-links'] })
  });
}
