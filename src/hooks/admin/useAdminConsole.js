import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export const useAdminClients = () => {
  return useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: async () => (await api.get('/admin/clients')).data
  });
};

export const useAdminClient = (clientId) => {
  return useQuery({
    queryKey: ['admin', 'clients', clientId],
    queryFn: async () => (await api.get(`/admin/clients/${clientId}`)).data,
    enabled: !!clientId
  });
};

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get('/admin/users')).data
  });
};

export const useAdminAuditLog = () => {
  return useQuery({
    queryKey: ['admin', 'audit-log'],
    queryFn: async () => (await api.get('/admin/audit-log')).data,
    refetchInterval: 25000
  });
};

export const useAdminClientErrors = () => {
  return useQuery({
    queryKey: ['admin', 'client-errors'],
    queryFn: async () => (await api.get('/admin/client-errors')).data,
    // "Instantly" here means a short poll, not a websocket -- plenty for an admin console
    // at this scale, and far simpler than standing up real-time infra for it.
    refetchInterval: 25000
  });
};

export const useAdminSupportTickets = () => {
  return useQuery({
    queryKey: ['admin', 'support-tickets'],
    queryFn: async () => (await api.get('/admin/support-tickets')).data,
    refetchInterval: 25000
  });
};

export const useAdminSupportTicket = (ticketId) => {
  return useQuery({
    queryKey: ['admin', 'support-tickets', ticketId],
    queryFn: async () => (await api.get(`/admin/support-tickets/${ticketId}`)).data,
    enabled: !!ticketId,
    refetchInterval: 15000
  });
};

export const useAdminReplySupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, body }) => (await api.post(`/admin/support-tickets/${ticketId}/messages`, { body })).data,
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to send reply');
    }
  });
};

export const useAdminUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }) => (await api.patch(`/admin/support-tickets/${ticketId}`, { status })).data,
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update ticket');
    }
  });
};

export const useOnboardClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/admin/clients', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to onboard client');
    }
  });
};

export const useAssumeClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId) => (await api.post(`/admin/clients/${clientId}/assume`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to assume client session');
    }
  });
};

// Recovery path of last resort: a client with only one Super Admin has no in-app way to
// recover a forgotten password (Team & Users blocks managing your own row) -- this is the
// platform admin's escape hatch, same encrypted-password mechanism as Team & Users.
export const useAdminViewUserPassword = () => {
  return useMutation({
    mutationFn: async (userId) => (await api.post(`/admin/users/${userId}/password/view`)).data,
    onError: (error) => toast.error(error?.message || 'Failed to view password')
  });
};

export const useAdminSetUserPassword = () => {
  return useMutation({
    mutationFn: async ({ userId, customPassword }) => (await api.post(`/admin/users/${userId}/password`, { customPassword })).data,
    onError: (error) => toast.error(error?.message || 'Failed to set password')
  });
};
