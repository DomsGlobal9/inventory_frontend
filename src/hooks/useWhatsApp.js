import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * WhatsApp: the shop's link, the Send buttons, and the owner's nightly Day Book. Every rule about
 * who may do what, and who a document goes to, is the server's; these only carry requests.
 */

/** Everything Settings > WhatsApp and the Send buttons need to know up front. */
export const useWhatsAppOverview = ({ poll = false, enabled = true } = {}) =>
  useQuery({
    queryKey: ['whatsapp', 'overview'],
    enabled,
    queryFn: async () => (await api.get('/whatsapp')).data,
    // While a QR or code is on screen, watch for the phone finishing the link.
    refetchInterval: poll ? 3000 : false,
    staleTime: 15_000
  });

export const useLinkWhatsApp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ method, phone }) => (await api.post('/whatsapp/link', { method, ...(phone ? { phone } : {}) })).data,
    onSettled: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'overview'] })
  });
};

export const useDisconnectWhatsApp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/whatsapp/disconnect')).data,
    onSettled: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'overview'] })
  });
};

export const useSendWhatsAppTest = () =>
  useMutation({ mutationFn: async ({ to, nonce }) => (await api.post('/whatsapp/test', { to, nonce })).data });

export const useSaveDayBookWhatsApp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.put('/whatsapp/day-book', body)).data,
    onSuccess: (dayBook) => qc.setQueryData(['whatsapp', 'overview'], old => (old ? { ...old, dayBook } : old))
  });
};

export const useSendDayBookNow = () =>
  useMutation({ mutationFn: async ({ nonce }) => (await api.post('/whatsapp/day-book/send-now', { nonce })).data });

/** Where the latest WhatsApp of one document has got to. Watched while it is still on its way. */
export const useWhatsAppMessage = (kind, id, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['whatsapp', 'message', kind, id],
    queryFn: async () => (await api.get('/whatsapp/messages', { params: { kind, id } })).data,
    enabled: enabled && Boolean(kind && id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && ['QUEUED', 'SENDING', 'SENT'].includes(s) ? 4000 : false;
    }
  });

export const useSendWhatsAppDocument = (kind, id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pdfBase64, fileName, nonce }) =>
      (await api.post('/whatsapp/send', { kind, id, pdfBase64, fileName, nonce })).data,
    onSuccess: (message) => qc.setQueryData(['whatsapp', 'message', kind, id], message)
  });
};

// ── The Day Book page's own Send button ─────────────────────────────────────────────────────

/** Can a Day Book be sent from the page, to which (masked) number, and how many are left today. */
export const useDayBookSending = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['whatsapp', 'day-book', 'sending'],
    queryFn: async () => (await api.get('/whatsapp/day-book/sending')).data,
    enabled,
    staleTime: 30000
  });

/** Sends the day, or the range, on the screen. `what` is { date } or { from, to }, plus locationId. */
export const useSendDayBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ what, nonce }) => (await api.post('/whatsapp/day-book/send', { ...what, nonce })).data,
    onSettled: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'day-book', 'sending'] })
  });
};

/** Where a Day Book sent from the page has got to. Watched while it is still on its way. */
export const useDayBookMessage = (id) =>
  useQuery({
    queryKey: ['whatsapp', 'day-book', 'message', id],
    queryFn: async () => (await api.get('/whatsapp/day-book/message', { params: { id } })).data,
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return !s || ['QUEUED', 'SENDING', 'SENT'].includes(s) ? 4000 : false;
    }
  });
