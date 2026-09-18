import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * One business day's activity.
 *
 * `date` is a "YYYY-MM-DD" key in the SHOP's timezone, which the server resolves -- the
 * browser's own clock is never used, because a shop owner checking yesterday's takings from
 * a phone in another timezone must still see their own business day.
 */
export const useDayBook = (date, locationId, range) => {
  const params = new URLSearchParams();
  // A range (both ends) wins over a single day; the server treats from === to as that one day.
  if (range?.from && range?.to) { params.set('from', range.from); params.set('to', range.to); }
  else if (date) params.set('date', date);
  if (locationId) params.set('locationId', locationId);
  const qs = params.toString();

  return useQuery({
    queryKey: ['daybook', range?.from && range?.to ? `${range.from}..${range.to}` : (date || 'today'), locationId || 'all'],
    queryFn: async () => (await api.get(`/daybook${qs ? `?${qs}` : ''}`)).data,
    // Today keeps changing as stock moves; a finished day never will.
    staleTime: 60000,
    placeholderData: (prev) => prev
  });
};
