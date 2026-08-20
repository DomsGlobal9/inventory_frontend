import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    }
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}`);
      return response.data;
    },
    enabled: !!id
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Supplier created successfully');
      queryClient.invalidateQueries(['suppliers']);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create supplier');
    }
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success('Supplier updated successfully');
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['suppliers', variables.id]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update supplier');
    }
  });
};
