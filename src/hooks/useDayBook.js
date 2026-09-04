import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * One business day's activity.
 *
 * `date` is a "YYYY-MM-DD" key in the SHOP's timezone, which the server resolves -- the
 * browser's own clock is never used, because a shop owner checking yesterday's takings from
 * a phone in another timezone must still see their own business day.
 */
export const useDayBook = (date, locationId) => {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (locationId) params.set('locationId', locationId);
  const qs = params.toString();

  return useQuery({
    queryKey: ['daybook', date || 'today', locationId || 'all'],
    queryFn: async () => (await api.get(`/daybook${qs ? `?${qs}` : ''}`)).data,
    // Today keeps changing as stock moves; a finished day never will.
    staleTime: 60000,
    placeholderData: (prev) => prev
  });
};
