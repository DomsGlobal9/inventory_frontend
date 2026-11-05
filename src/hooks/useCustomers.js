import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useCustomers = (filters = {}) => {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.group) params.group = filters.group;
      if (filters.limit) params.limit = filters.limit;

      return api.get('/customers', { params });
    },
    // Show more keeps the rows on screen while the longer list loads. A new search or group does not.
    placeholderData: (previous, query) => {
      const was = query?.queryKey?.[1];
      return was && was.search === filters.search && was.group === filters.group ? previous : undefined;
    }
  });
};

export const useCustomerDetails = (id) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) return null;
      return api.get(`/customers/${id}`);
    },
    enabled: !!id
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      return api.patch(`/customers/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    }
  });
};
