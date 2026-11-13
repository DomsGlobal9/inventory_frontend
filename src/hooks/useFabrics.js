import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Fabrics by the metre: the shop's switch, defaults, and the units/kinds to choose from (PLAN-fabrics.md).
 * GET /fabrics -> { fabricsOn, fabricMinCut, fabricRollSize, fabricQuickLengths (cm), units, kinds }.
 */
const KEY = ['fabrics'];

export function useFabrics() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/fabrics')).data,
    staleTime: 60_000
  });
}

export function useSetFabrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch) => (await api.put('/fabrics', patch)).data,
    onSuccess: (data) => qc.setQueryData(KEY, (old) => ({ ...(old ?? {}), ...data })),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY })
  });
}
