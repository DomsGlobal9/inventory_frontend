import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

// Fetch all catalog items for the current tenant (including inactive ones)
export function useCatalogItems() {
  return useQuery({
    queryKey: ['catalog-items'],
    queryFn: async () => {
      const res = await api.get('/catalog/items');
      return res.data?.data || res.data; // Handle wrapped `{ success, data: [] }` or raw `[]`
    },
  });
}

// Add a new catalog item
export function useAddCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newItem) => {
      const res = await api.post('/catalog/items', newItem);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Catalog item added successfully');
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-config'] }); // Invalidate product creation config too
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to add catalog item');
    }
  });
}

// Update an existing catalog item (e.g. edit label, toggle isActive)
export function useUpdateCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const res = await api.patch(`/catalog/items/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Catalog item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-config'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update catalog item');
    }
  });
}

// Soft delete a catalog item
export function useDeleteCatalogItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/catalog/items/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Catalog item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['catalog-items'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-config'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to delete catalog item');
    }
  });
}
