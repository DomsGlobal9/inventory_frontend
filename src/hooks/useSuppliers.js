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
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create supplier');
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
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
      // SupplierDetails.jsx queries ['supplier', id] (singular). Invalidating only the
      // plural key refreshed the list but never the detail page you were looking at.
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update supplier');
    }
  });
};

// ─── SUPPLIER <-> PRODUCT CATALOGUE ───
//
// Which supplier sells which item. Both directions read the same relationship: the supplier
// page asks "what do we buy from them", the product page asks "who do we buy this from".

export const useSupplierProducts = (supplierId, search) => {
  return useQuery({
    queryKey: ['supplier-products', supplierId, search || ''],
    queryFn: async () => {
      const params = search ? { search } : undefined;
      return (await api.get(`/suppliers/${supplierId}/products`, { params })).data;
    },
    enabled: Boolean(supplierId)
  });
};

export const useVariantSuppliers = (variantId) => {
  return useQuery({
    queryKey: ['variant-suppliers', variantId],
    queryFn: async () => (await api.get(`/variants/${variantId}/suppliers`)).data,
    enabled: Boolean(variantId)
  });
};

// Both sides of the relationship are cached separately, so every mutation has to clear both
// or the page you are not looking at keeps showing a link that no longer exists.
const invalidateBothSides = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
  queryClient.invalidateQueries({ queryKey: ['variant-suppliers'] });
};

export const useLinkSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/supplier-products', payload)).data,
    onSuccess: () => {
      invalidateBothSides(queryClient);
      toast.success('Supplier link saved');
    },
    onError: (error) => toast.error(error?.message || 'Could not save the supplier link')
  });
};

export const useUnlinkSupplierProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/supplier-products/${id}`)).data,
    onSuccess: () => {
      invalidateBothSides(queryClient);
      toast.success('Supplier link removed');
    },
    onError: (error) => toast.error(error?.message || 'Could not remove the supplier link')
  });
};

export const useSetPreferredSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/supplier-products/${id}/preferred`, {})).data,
    onSuccess: () => {
      invalidateBothSides(queryClient);
      toast.success('Preferred supplier updated');
    },
    onError: (error) => toast.error(error?.message || 'Could not set the preferred supplier')
  });
};
