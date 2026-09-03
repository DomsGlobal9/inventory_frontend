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
    // A short poll while a ticket is open on screen so a platform-admin reply shows up
    // without the client needing to refresh.
    refetchInterval: 15000
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

export const useReplySupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }) => (await api.post(`/support-tickets/${ticketId}/messages`, { body })).data,
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to send reply');
    }
  });
};
