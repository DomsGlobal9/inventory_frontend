import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVariants, createVariant, bulkCreateVariants, bulkUpdateVariants, updateVariant, deleteVariant } from '../services/variant.service';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'react-hot-toast';

export const useVariants = (productId: string) => {
  return useQuery({
    queryKey: queryKeys.variants(productId),
    queryFn: () => getVariants(productId),
    enabled: !!productId,
  });
};

export const useCreateVariant = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
      toast.success('Variant created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variant');
    }
  });
};

export const useBulkCreateVariants = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variants, applyToAllLocations = false }: { variants: any[]; applyToAllLocations?: boolean }) =>
      bulkCreateVariants(productId, variants, applyToAllLocations),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
      
      const res = data.data; // data unwrapped once in interceptor, but we return data wrapper in controller?
      // Wait, our axios interceptor returns response.data
      // And backend controller does res.json({ success: true, data: result })
      // So data here IS { success: true, data: { created, skipped, errors } }
      // The interceptor returns response.data, so data.data is the payload.
      const payload = data.data;

      if (payload.skipped > 0) {
        toast.success(`Created ${payload.created} variants. Skipped ${payload.skipped}.`);
      } else {
        toast.success(`Successfully created ${payload.created} variants.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variants');
    }
  });
};

export const useBulkUpdateVariants = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: any[]) => bulkUpdateVariants(updates),
    onSuccess: (data: any) => {
      // Invalidate all variants and products since bulk update can affect many
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      
      const payload = data.data; // The returned data object
      
      if (payload.skipped > 0) {
        toast.success(`Updated ${payload.updated} variants. Skipped ${payload.skipped}.`);
      } else {
        toast.success(`Successfully updated ${payload.updated} variants.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update variants');
    }
  });
};

export const useUpdateVariant = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      toast.success('Variant updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update variant');
    }
  });
};

export const useDeleteVariant = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
      toast.success('Variant deleted successfully');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to delete variant';
      toast.error(msg);
    }
  });
};
