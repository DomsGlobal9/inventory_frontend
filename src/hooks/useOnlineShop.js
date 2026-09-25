import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

/**
 * The shop's own online shop (PLAN-online-shop.md). Only the owner's side lives here -- what a
 * shopper's browser asks for comes from the separate shop app, not from this one.
 */
const KEY = ['online-shop'];

export const useOnlineShop = () => useQuery({
  queryKey: KEY,
  queryFn: async () => (await api.get('/online-shop')).data
});

const useShopMutation = (fn, onDone) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      // The server sends the whole settings back, so the screen never has to guess what changed.
      qc.setQueryData(KEY, result);
      onDone?.(result);
    },
    onError: (e) => toast.error(e?.message || 'That could not be saved.')
  });
};

/** Claim the web address, or change one the shop has never opened on. */
export const useChooseShopAddress = () => useShopMutation(
  async (slug) => (await api.post('/online-shop/address', { slug })).data,
  (r) => toast.success(`Your shop's address is ${r.slug}.`)
);

export const useSaveOnlineShop = () => useShopMutation(
  async (patch) => (await api.patch('/online-shop', patch)).data
);

export const useSetShopOpen = () => useShopMutation(
  async (open) => (await api.post(`/online-shop/${open ? 'open' : 'close'}`, {})).data,
  (r) => toast.success(r.isLive ? 'Your shop is open. Share the link with your customers.' : 'Your shop is closed. The link now says so.')
);

/* ── The shop's icon ──────────────────────────────────────────────────────────────────────
 * These two answer with only { iconUrl }, not the whole settings object, because a picture is
 * the one thing the settings save does not carry. So they patch the cached settings rather than
 * replacing them -- handing the cache { iconUrl } alone would wipe the address, the return
 * policy and everything else off the screen until the next fetch.
 */
const usePatchShop = (fn, done) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      qc.setQueryData(KEY, (old) => (old ? { ...old, ...result } : old));
      done?.(result);
    },
    onError: (e) => toast.error(e?.message || 'That could not be saved.')
  });
};

export const useSetShopIcon = () => usePatchShop(
  async (base64) => (await api.post('/online-shop/icon', { base64 })).data,
  () => toast.success('Icon saved.')
);

export const useClearShopIcon = () => usePatchShop(
  async () => (await api.delete('/online-shop/icon')).data,
  () => toast.success('Icon removed. Your logo is used instead.')
);

/* ── Banners ──────────────────────────────────────────────────────────────────────────────
 * The pictures across the top of the shop. Their own query key, because a banner changing has
 * nothing to do with the address or the return policy and should not make those redraw.
 *
 * Every one of these answers with the whole list, so the screen never has to work out where a new
 * banner belongs or what a reorder did -- it is simply given the truth back.
 */
const BANNERS = ['online-shop', 'banners'];

export const useShopBanners = () => useQuery({
  queryKey: BANNERS,
  queryFn: async () => (await api.get('/online-shop/banners')).data
});

const useBannerMutation = (fn, onDone) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (list) => { qc.setQueryData(BANNERS, list); onDone?.(list); },
    onError: (e) => toast.error(e?.message || 'That could not be saved.')
  });
};

export const useAddBanner = () => useBannerMutation(
  async (banner) => (await api.post('/online-shop/banners', banner)).data,
  () => toast.success('Banner added.')
);

export const useEditBanner = () => useBannerMutation(
  async ({ id, ...patch }) => (await api.patch(`/online-shop/banners/${id}`, patch)).data,
  () => toast.success('Banner saved.')
);

export const useReorderBanners = () => useBannerMutation(
  async (ids) => (await api.patch('/online-shop/banners/order', { ids })).data
);

export const useRemoveBanner = () => useBannerMutation(
  async (id) => (await api.delete(`/online-shop/banners/${id}`)).data,
  () => toast.success('Banner removed.')
);
