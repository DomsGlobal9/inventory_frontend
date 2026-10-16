import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Gift vouchers, the shop's side (backend routes/gift-voucher.routes.ts). */
export const useGiftVoucherSettings = () => useQuery({
  queryKey: ['gift-vouchers', 'settings'],
  queryFn: async () => (await api.get('/gift-vouchers/settings')).data
});

export const useSaveGiftVoucherSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.put('/gift-vouchers/settings', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gift-vouchers'] })
  });
};

export const useGiftVouchers = (filters) => useQuery({
  queryKey: ['gift-vouchers', 'list', filters],
  queryFn: async () => (await api.get('/gift-vouchers', { params: filters })).data
});

export const useGiftVoucher = (id) => useQuery({
  queryKey: ['gift-vouchers', 'one', id],
  queryFn: async () => (await api.get(`/gift-vouchers/${id}`)).data,
  enabled: !!id
});

const change = (path) => () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => (await api.post(`/gift-vouchers/${id}/${path}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gift-vouchers'] })
  });
};
export const useExtendGiftVoucher = change('extend');
export const useBlockGiftVoucher = change('block');
export const useUnblockGiftVoucher = change('unblock');
