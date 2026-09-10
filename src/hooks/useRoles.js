import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useRoles = () => useQuery({
  queryKey: ['roles'],
  queryFn: async () => (await api.get('/roles')).data
});

/**
 * The permission list as the server describes it: grouped, in plain language, and each one
 * flagged with whether THIS person is allowed to hand it out.
 *
 * Fetched rather than hard-coded in the browser. A copy of the catalogue here would be a second
 * list to keep in step, and the day it drifted the screen would offer a checkbox the server
 * then refused.
 */
export const usePermissionCatalogue = () => useQuery({
  queryKey: ['roles', 'catalogue'],
  queryFn: async () => (await api.get('/roles/catalogue')).data,
  staleTime: 10 * 60 * 1000
});

/**
 * `error.message`, not `error.response.data.message`.
 *
 * lib/api.ts's interceptor rejects with the already-unwrapped response BODY, so `error` IS
 * `{ success, message }` and `error.response` does not exist. Reaching for the axios shape
 * therefore always returned undefined and fell through to the generic fallback -- so the roles
 * screen could only ever say "Could not create the role", never the reason.
 *
 * Which is the worst place to lose it. The role service refuses with sentences written to be
 * read: "You cannot give a role something you do not have yourself: See cost prices", or
 * "Total access cannot be granted from this screen." Those explain what to do instead; the
 * fallback explains nothing. The same trap is written up in useSalesOrders.js, which had it
 * fixed already.
 */
const onError = (fallback) => (error) =>
  toast.error(error?.message || fallback);

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/roles', payload)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); },
    onError: onError('Could not create the role')
  });
};

export const useUpdateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.patch(`/roles/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      // Their own session may have just changed shape, so re-read it rather than letting the
      // browser act on what it believed a minute ago.
      qc.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Role saved');
    },
    onError: onError('Could not save the role')
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/roles/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role deleted'); },
    // A role people are using comes back as 409 with a message naming how many. Shown as it is
    // written -- the server already put it in the words the person needs.
    onError: onError('Could not delete the role')
  });
};

/**
 * Who a change would affect, asked before it is saved.
 *
 * A mutation rather than a query because it takes the proposed permission list: the question is
 * "what would happen if I saved this", not "what is true now".
 */
export const useRoleImpact = () => useMutation({
  mutationFn: async ({ id, permissions }) => (await api.post(`/roles/${id}/impact`, { permissions })).data
});
