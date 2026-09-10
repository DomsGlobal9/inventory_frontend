import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useSupportTickets = () => {
  return useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => (await api.get('/support-tickets')).data
  });
};

export const useSupportTicket = (ticketId) => {
  return useQuery({
    queryKey: ['support-tickets', ticketId],
    queryFn: async () => (await api.get(`/support-tickets/${ticketId}`)).data,
    enabled: !!ticketId,
    // Polled hard while a single ticket is open on screen. Fifteen seconds is a long time to
    // sit looking at a chat window waiting for an answer that has already been written -- long
    // enough that refreshing the page felt like the way to get your messages, which is what
    // people were doing. This is one small request for one open ticket, not a list.
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    // And immediately when the laptop comes back from sleep or the wifi returns.
    refetchOnReconnect: true
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/support-tickets', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support ticket submitted');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to submit ticket');
    }
  });
};

/**
 * Put a message on screen the moment it is sent.
 *
 * Sending used to fire the request, wait for it, then invalidate and wait for a refetch --
 * two round trips on a database that answers in seconds. You typed, pressed send, the box
 * emptied, and nothing appeared. The natural reading is that it did not go, so people send it
 * again; the natural fix people found was refreshing the page.
 *
 * The message is shown immediately with a temporary id, marked as sending so it is honest
 * about not being confirmed yet, and replaced by the server's own copy when the refetch
 * lands. A failure takes it back off and says why, rather than leaving a message that looks
 * delivered and is not.
 */
export const useReplySupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }) => (await api.post(`/support-tickets/${ticketId}/messages`, { body })).data,
    // See the note on this file: a chat message must appear when it is sent.
    onMutate: async ({ ticketId, body }) => {
      const key = ['support-tickets', ticketId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old) => {
        if (!old) return old;
        const target = old.messages ? old : (old.data?.messages ? old.data : null);
        if (!target) return old;
        const pending = {
          id: `pending-${Date.now()}`,
          authorType: 'CLIENT',
          authorName: 'You',
          body,
          createdAt: new Date().toISOString(),
          pending: true
        };
        const next = { ...target, messages: [...target.messages, pending] };
        return old.messages ? next : { ...old, data: next };
      });

      return { key, previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(context.key, context.previous);
      toast.error(error?.message || 'Could not send that message.');
    },
    onSettled: (_data, _err, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    }
  });
};
