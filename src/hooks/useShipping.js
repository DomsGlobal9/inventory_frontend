import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * The shop's couriers (Settings → Couriers) and a dispatch's courier, tracking number and
 * delivery. Server: routes/shipping.routes.ts. Names and numbers only; nothing is booked anywhere.
 */
const COURIERS = ['shipping', 'couriers'];

export const useCouriers = (enabled = true) => useQuery({
  queryKey: COURIERS,
  queryFn: async () => (await api.get('/shipping/couriers')).data,
  enabled,
  staleTime: 60_000
});

const useCourierChange = (fn, done) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COURIERS });
      if (done) toast.success(typeof done === 'function' ? done(data) : done);
    },
    onError: (e) => toast.error(e?.message || 'That could not be saved. Try again.')
  });
};

export const useAddCourier = (quiet = false) =>
  useCourierChange(async (body) => (await api.post('/shipping/couriers', body)).data, quiet ? null : (c) => `${c.name} added`);
export const useEditCourier = () =>
  useCourierChange(async ({ id, ...body }) => (await api.patch(`/shipping/couriers/${id}`, body)).data, 'Saved');
export const useRemoveCourier = () =>
  useCourierChange(async (id) => (await api.delete(`/shipping/couriers/${id}`)).data, 'Courier removed');

/** Courier or tracking number of a dispatch already made, or Delivered / not yet. */
export const useParcelChange = (orderId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delivered, ...body }) =>
      delivered === undefined
        ? (await api.put(`/shipping/dispatches/${id}`, body)).data
        : (await api.post(`/shipping/dispatches/${id}/delivered`, { delivered })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
    onError: (e) => toast.error(e?.message || 'That could not be saved. Try again.')
  });
};
