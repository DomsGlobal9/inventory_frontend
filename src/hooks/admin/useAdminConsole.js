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

// ─── SIGNUP LEADS ───

export const useAdminLeads = (params = {}) => {
  const page = params.page || 1;
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  // The list is newest-first and the server pages at 25. Without sending a page the older
  // leads were simply unreachable -- a burst of new enquiries pushed genuine earlier ones
  // off the only page the console could show, with nothing on screen to say more existed.
  query.set('page', String(page));
  const qs = query.toString();

  return useQuery({
    // params are part of the key so switching filter, search or page refetches rather than
    // serving the previous one's rows.
    queryKey: ['admin', 'leads', params.status || 'ALL', params.search || '', page],
    queryFn: async () => (await api.get(`/admin/leads${qs ? `?${qs}` : ''}`)),
    // Keeps the current rows on screen while the next page loads, instead of flashing the
    // empty state between pages.
    placeholderData: (prev) => prev,
    // A lead arriving is the one thing on this page worth seeing without a refresh --
    // same short poll as errors and tickets.
    refetchInterval: 25000
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await api.patch(`/admin/leads/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update lead');
    }
  });
};

export const useConvertLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...overrides }) => (await api.post(`/admin/leads/${id}/convert`, overrides)).data,
    onSuccess: () => {
      // Converting creates a real workspace, so the Clients list is stale too.
      queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to convert lead');
    }
  });
};

// ─── PLATFORM ADMINS ──────────────────────────────────────────────────────────
// Who can reach this console at all. Every account here sees every tenant, so the list is
// deliberately small and the actions on it are few.

export const usePlatformAdmins = () => {
  return useQuery({
    queryKey: ['admin', 'platform-admins'],
    queryFn: async () => (await api.get('/admin/platform-admins')).data ?? []
  });
};

export const useCreatePlatformAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => (await api.post('/admin/platform-admins', input)).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-admins'] });
      // Not toasted as the whole story: the password is shown on screen and must stay there
      // until dismissed, because there is no way to retrieve it afterwards.
      if (result?.emailed) toast.success(`Added. Login sent to ${result.email}.`);
      else toast.error(`Added, but not emailed: ${result?.emailReason ?? 'unknown reason'}`, { duration: 12000 });
    },
    onError: (error) => toast.error(error?.message || 'Could not add that platform admin')
  });
};

export const useSetPlatformAdminStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/admin/platform-admins/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'platform-admins'] });
      toast.success('Updated');
    },
    onError: (error) => toast.error(error?.message || 'Could not update that admin')
  });
};

/**
 * Issues a NEW password and emails it.
 *
 * There is no "resend" for a platform admin, because no recoverable copy of the password is
 * kept -- these accounts can see every tenant, so a decryptable copy would be a far larger
 * prize than a shop assistant's. The honest operation is replacement, and the existing
 * password stops working immediately.
 */
export const useResetPlatformAdminPassword = () => {
  return useMutation({
    // An object rather than a bare id, so the caller can pass a chosen password AND so the
    // page can tell WHICH row is currently working -- `reset.variables.id`. With a bare id
    // every card in the grid shows the same spinner at once.
    mutationFn: async ({ id, customPassword }) =>
      (await api.post(`/admin/platform-admins/${id}/password`, { customPassword })).data,
    onSuccess: (result) => {
      if (result?.emailed) toast.success(`New password sent to ${result.email}.`);
      else toast.error(`Password changed, but not emailed: ${result?.emailReason ?? 'unknown reason'}`, { duration: 12000 });
    },
    onError: (error) => toast.error(error?.message || 'Could not reset that password')
  });
};

// ─── SUSPENDING AND DELETING A CLIENT ─────────────────────────────────────────

export const useSetClientSuspended = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, suspended }) =>
      (await api.patch(`/admin/clients/${clientId}/suspend`, { suspended })).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
      toast.success(result?.suspended
        ? `Suspended. ${result.usersAffected} account${result.usersAffected === 1 ? '' : 's'} can no longer sign in.`
        : 'Reinstated. Their team can sign in again.');
    },
    onError: (error) => toast.error(error?.message || 'Could not change that client')
  });
};

/** What a deletion would destroy. Read before anyone is asked to confirm it. */
export const useClientDeletionPreview = (clientId, enabled) => {
  return useQuery({
    queryKey: ['admin', 'clients', clientId, 'deletion-preview'],
    queryFn: async () => (await api.get(`/admin/clients/${clientId}/deletion-preview`)).data,
    enabled: Boolean(clientId && enabled),
    // Always refetched when the dialog opens. A cached count from ten minutes ago is exactly
    // the wrong thing to show someone deciding whether to erase a business.
    staleTime: 0
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, confirmation }) =>
      (await api.delete(`/admin/clients/${clientId}`, { data: { confirmation } })).data,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(`${result?.clientId} has been erased.`);
    },
    onError: (error) => toast.error(error?.message || 'Could not delete that client', { duration: 12000 })
  });
};
