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
