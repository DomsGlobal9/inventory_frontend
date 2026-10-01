import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useLocationContext } from '../contexts/LocationContext';

/**
 * Whether the store on screen bills at a ScaleEzy POS till.
 *
 * A store with a connected till rings its sales up there, so Inventory stops offering its own New
 * sale for that store: two places to bill means two invoice series and two answers to "what did
 * we sell today". It is per STORE, not per shop -- a shop with a till at one branch and none at
 * the other still needs New sale at the other.
 *
 * While the answer is on its way, `billsAtPos` is false: hiding the shop's only way to bill on a
 * slow connection would be worse than showing a button for a moment.
 */
export function useTillLocations() {
  const { currentLocation } = useLocationContext();
  const { data } = useQuery({
    queryKey: ['pos', 'billing-locations'],
    queryFn: async () => (await api.get('/pos-connections/billing-locations')).data?.locationIds ?? [],
    staleTime: 60_000
  });
  const ids = data ?? [];
  return {
    tillLocationIds: ids,
    billsAtPos: Boolean(currentLocation?.id && ids.includes(currentLocation.id)),
    storeName: currentLocation?.name ?? 'This store'
  };
}
