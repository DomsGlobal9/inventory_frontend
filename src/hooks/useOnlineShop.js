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

/* ── Payments: the shop's own Razorpay account ─────────────────────────────────────────────
 * Its own cache entry: the settings object never carries it, and the keys screen answers with
 * { account, webhookSecret } for the two actions that hand over a webhook secret (shown once) and
 * with the account alone for the rest. Either way, the account is what gets cached -- a secret
 * is never kept anywhere a later render could show it again.
 */
const PAY_KEY = ['online-shop', 'payments'];

export const useShopPayments = () => useQuery({
  queryKey: PAY_KEY,
  queryFn: async () => (await api.get('/online-shop/payments')).data
});

const usePaymentMutation = (fn, done) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      qc.setQueryData(PAY_KEY, result?.account ?? result);
      /*
       * The shop's own settings too. Disconnecting switches paying online OFF on the server, and
       * keys that stop working take it off the checkout -- the "Taking orders" card must show that,
       * not the tick it had before.
       */
      qc.invalidateQueries({ queryKey: KEY, exact: true });
      done?.(result);
    },
    onError: (e) => toast.error(e?.message || 'That could not be saved.')
  });
};

/** Save the Key ID and Key Secret; the server checks them at once. */
export const useSavePaymentKeys = () => usePaymentMutation(
  async (keys) => (await api.put('/online-shop/payments', keys)).data
);

export const useCheckPayments = () => usePaymentMutation(
  async () => (await api.post('/online-shop/payments/check', {})).data
);

export const useNewWebhookSecret = () => usePaymentMutation(
  async () => (await api.post('/online-shop/payments/webhook-secret', {})).data
);

/** UPI QR at the POS till: the owner's on/off (Razorpay charges the shop per payment). */
export const useSetUpiQr = () => usePaymentMutation(
  async (enabled) => (await api.put('/online-shop/payments/upi-qr', { enabled })).data
);

/**
 * What has been paid online lately, and what has gone back. Re-asked every half minute while the
 * card is open: a refund Razorpay is still processing turns into "refunded" on its own.
 */
export const useOnlinePaymentActivity = (enabled = true) => useQuery({
  queryKey: [...PAY_KEY, 'activity'],
  queryFn: async () => (await api.get('/online-shop/payments/activity')).data,
  enabled,
  refetchInterval: 30_000
});

/**
 * Money back to a customer who paid online -- all or part. The request key is made once per refund
 * the owner starts, so a double click or a retry after a slow answer refunds once, never twice.
 */
export const useRefundOnline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post('/online-shop/payments/refund', body)).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [...PAY_KEY, 'activity'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      if (r?.status === 'FAILED') toast.error('Razorpay could not refund it. The customer has NOT been refunded — see the alert for why.');
      else if (r?.status === 'PROCESSED') toast.success('Refunded. It reaches the customer in 5–7 working days.');
      else toast.success('Refund started. Razorpay is processing it.');
    },
    onError: (e) => toast.error(e?.message || 'That refund could not be started.')
  });
};

export const useDisconnectPayments = () => usePaymentMutation(
  async () => (await api.delete('/online-shop/payments')).data,
  () => toast.success('Your Razorpay account is disconnected. Its keys are deleted.')
);
