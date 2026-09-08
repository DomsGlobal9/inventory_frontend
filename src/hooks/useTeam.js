import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => (await api.get('/team/members')).data
  });
};

export const useTeamRoles = () => {
  return useQuery({
    queryKey: ['team', 'roles'],
    queryFn: async () => (await api.get('/team/roles')).data
  });
};

export const useTeamActivity = () => {
  return useQuery({
    queryKey: ['team', 'activity'],
    queryFn: async () => (await api.get('/team/activity')).data,
    refetchInterval: 30000
  });
};

export const useInviteTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/team/members', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', 'members'] }),
    onError: (error) => toast.error(error?.message || 'Failed to add team member')
  });
};

export const useUpdateTeamMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleId }) => (await api.patch(`/team/members/${userId}/role`, { roleId })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team', 'members'] }); toast.success('Role updated'); },
    onError: (error) => toast.error(error?.message || 'Failed to update role')
  });
};

export const useSetTeamMemberStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }) => (await api.patch(`/team/members/${userId}/status`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', 'members'] }),
    onError: (error) => toast.error(error?.message || 'Failed to update status')
  });
};

export const useViewTeamMemberPassword = () => {
  return useMutation({
    mutationFn: async (userId) => (await api.post(`/team/members/${userId}/password/view`)).data,
    onError: (error) => toast.error(error?.message || 'Failed to view password')
  });
};

/**
 * Sends a team member their existing login again.
 *
 * Not the same as setting a new password. The everyday case is a message that went to spam or
 * was deleted, and changing the password to fix that would break the login for anyone already
 * using it -- solving a delivery problem by creating an access one.
 */
export const useResendTeamMemberCredentials = () => {
  return useMutation({
    mutationFn: async (userId) => (await api.post(`/team/members/${userId}/credentials/resend`)).data,
    onSuccess: (result) => toast.success(`Sent again to ${result?.email ?? 'their address'}.`),
    onError: (error) => toast.error(error?.message || 'Could not resend the login')
  });
};

export const useSetTeamMemberPassword = () => {
  return useMutation({
    mutationFn: async ({ userId, customPassword }) => (await api.post(`/team/members/${userId}/password`, { customPassword })).data,
    onError: (error) => toast.error(error?.message || 'Failed to set password')
  });
};

export const useUpdateMyProfile = () => {
  return useMutation({
    mutationFn: async (payload) => (await api.patch('/auth/me', payload)).data,
    onError: (error) => toast.error(error?.message || 'Failed to update profile')
  });
};

/**
 * A Super Admin changing their own password.
 *
 * The only self-service password change in the product. Everyone else's is set for them by an
 * admin and stays permanent -- the owner is the exception because there is nobody above them
 * to reset it.
 */
export const useChangeMyPassword = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) =>
      (await api.post('/auth/me/password', { currentPassword, newPassword })).data,
    onSuccess: () => toast.success('Password changed. Use the new one next time you sign in.'),
    onError: (error) => toast.error(error?.message || 'Could not change the password')
  });
};

/**
 * The platform services this workspace uses.
 *
 * Read only, and the response cannot contain a key -- the endpoint returns a prefix and never
 * decrypts. See service-catalogue.routes.ts.
 */
export const useMyServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get('/services')).data ?? [],
    staleTime: 60_000
  });
};

/** This workspace's own try-on usage for the current month. */
export const useMyTryOnUsage = () => {
  return useQuery({
    queryKey: ['services', 'tryon-usage'],
    queryFn: async () => (await api.get('/services/tryon-usage')).data,
    staleTime: 30_000
  });
};
