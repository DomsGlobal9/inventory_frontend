import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { invalidateDerivedViews } from '../lib/invalidate';

/**
 * Narrower than a tablet held upright: a phone. Selling is done from the counter computer or a
 * tablet, so New sale and its buttons are not offered below this width.
 */
export const COUNTER_PHONE_QUERY = '(max-width: 767px)';

/** A value that only changes once typing has paused. */
export function useDebounced(value, ms = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** Items that can be sold at this store: this store's price and how many are free here. Never cost. */
export const useSellableSearch = (q, locationId) => useQuery({
  queryKey: ['counter-items', locationId, q],
  queryFn: async () => (await api.get('/counter-sales/items', { params: { q, locationId } })).data,
  enabled: !!locationId && !!q && q.trim().length > 0,
  staleTime: 5_000,
  placeholderData: (previous) => previous
});

/** The customer saved with this number, or null. `stored` is the number in its one form (+91…). */
export const useCustomerByPhone = (stored) => useQuery({
  queryKey: ['customers', 'by-phone', stored],
  queryFn: async () => (await api.get(`/customers/by-phone/${encodeURIComponent(stored)}`)).data ?? null,
  enabled: !!stored,
  staleTime: 30_000
});

/**
 * What the basket costs, asked again half a second after anything changes.
 *
 * The server prices it -- offers, codes, this store's prices -- and keeps the answer for fifteen
 * minutes as a quote. Complete sale sends that quote back, so the customer pays what the screen
 * showed, never a price re-worked a moment later.
 */
export const usePricingQuote = ({ locationId, customerId, lines, couponCodes }) => {
  const current = JSON.stringify({ locationId, customerId: customerId || null, lines, couponCodes });
  const request = useDebounced(current, 450);
  const query = useQuery({
    queryKey: ['counter-quote', request],
    queryFn: async () => {
      const body = JSON.parse(request);
      return (await api.post('/pricing/quote', { ...body, channel: 'POS' })).data;
    },
    // On the basket being ASKED about -- the settled one -- not the one on screen. Keyed on the screen,
    // the first scan switched pricing on while the settled request still held the empty basket, and
    // the server's "There is nothing in this basket" popped up on every first item.
    enabled: !!locationId && lines.length > 0 && JSON.parse(request).lines.length > 0,
    // A quote is good for fifteen minutes. Asked again well before then, so a basket left on the
    // screen over tea is never completed on a price the server has already let go.
    refetchInterval: 10 * 60_000,
    staleTime: 60_000,
    retry: false,
    placeholderData: (previous) => previous
  });
  // The price on screen is for THIS basket: not one from before the last tap, not one still coming.
  const upToDate = request === current && !query.isFetching && !query.isPlaceholderData && !!query.data;
  return { ...query, upToDate };
};

export const useCompleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => api.post('/counter-sales', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['counter-items'] });
      // Stock came off the shelf: alerts, reorder and the day book all move.
      invalidateDerivedViews(queryClient);
    }
  });
};

export const useReceipt = (orderId) => useQuery({
  queryKey: ['sales-orders', orderId, 'receipt'],
  queryFn: async () => (await api.get(`/counter-sales/${orderId}/receipt`)).data,
  enabled: !!orderId
});
