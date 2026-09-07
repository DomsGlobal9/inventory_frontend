import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVariants, createVariant, bulkCreateVariants, bulkUpdateVariants, updateVariant, deleteVariant } from '../services/variant.service';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'react-hot-toast';
import { invalidateDerivedViews } from '../lib/invalidate';

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
      invalidateDerivedViews(queryClient); // variant count + inventory value
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
      invalidateDerivedViews(queryClient); // variant count + inventory value
      
      // The interceptor already unwraps to the response body, and the controller replies
      // { success, data }, so the payload is data.data.
      const payload = data.data;

      // A variant that did not get created is a failure, not a footnote. This used to show a
      // green "Created 1 variants. Skipped 1." -- which reads as "the duplicate was ignored,
      // all fine" -- and a real customer lost a variant off their first product without ever
      // being told. If something did not save, say so and say which.
      if (payload.skipped > 0) {
        const why = (payload.errors || [])
          .map((e: any) => e?.sku ? `${e.sku}: ${e.reason || 'could not be created'}` : String(e?.reason || e))
          .slice(0, 3)
          .join('; ');
        toast.error(
          `${payload.created} of ${payload.created + payload.skipped} variants saved. ` +
          `${payload.skipped} failed${why ? ` -- ${why}` : ''}. Please add the missing ones again.`,
          { duration: 10000 }
        );
      } else {
        toast.success(`Successfully created ${payload.created} variants.`);
      }

      // The SKU it was given is not the SKU it asked for, so the user is told rather than
      // discovering it later on a label.
      if (payload.adjusted?.length) {
        const list = payload.adjusted
          .map((a: any) => `${a.requested} -> ${a.used}`)
          .slice(0, 3)
          .join(', ');
        toast(`Renamed to keep SKUs unique: ${list}`, { duration: 8000, icon: 'ℹ️' });
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
      invalidateDerivedViews(queryClient); // variant count + inventory value
      
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
      invalidateDerivedViews(queryClient); // variant count + inventory value
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
      invalidateDerivedViews(queryClient); // variant count + inventory value
      toast.success('Variant deleted successfully');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to delete variant';
      toast.error(msg);
    }
  });
};
