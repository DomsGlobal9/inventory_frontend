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
          `${payload.skipped} failed${why ? ` — ${why}` : ''}. Please add the missing ones again.`,
          { duration: 10000 }
        );
      } else {
        toast.success(`Successfully created ${payload.created} variants.`);
      }

      // The variant exists but its opening quantity did not apply. Different remedy from a
      // failed create, so it gets its own message: adding the variant again would duplicate it.
      if (payload.stockNotApplied?.length) {
        const list = payload.stockNotApplied
          .map((s: any) => `${s.sku} (${s.quantity})`).slice(0, 3).join(', ');
        toast.error(
          `Created, but no opening stock was added for: ${list}. ` +
          `Set the quantity from the product page — do not add these again.`,
          { duration: 14000 }
        );
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
    mutationFn: ({ updates, locationId }: { updates: any[]; locationId?: string }) =>
      bulkUpdateVariants(updates, locationId),
    onSuccess: (data: any) => {
      // Invalidate all variants and products since bulk update can affect many
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      invalidateDerivedViews(queryClient); // variant count + inventory value
      
      const payload = data.data; // The returned data object

      // Same reasoning as the create above, and it matters more here: this is the CSV import,
      // so a row that did not apply is a stock quantity that never changed. Reporting that in
      // green as "Skipped 2" let a spreadsheet half-apply and the levels drift, with no list
      // of which rows to fix -- the modal closes and discards the parsed file on success.
      if (payload.skipped > 0) {
        const why = (payload.errors || [])
          .map((e: any) => (e?.sku ? `${e.sku}: ${e.reason || 'not applied'}` : String(e?.reason || e)))
          .slice(0, 4)
          .join('; ');
        toast.error(
          `${payload.updated} of ${payload.updated + payload.skipped} rows applied. ` +
          `${payload.skipped} failed${why ? ` — ${why}` : ''}.`,
          { duration: 12000 }
        );
      } else {
        toast.success(`Successfully updated ${payload.updated} variants.`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update variants');
    }
  });
};

/**
 * Edits land in the table immediately, before the server has answered.
 *
 * This used to wait. VariantTable commits a price by firing the mutation and dropping its
 * local draft in the same tick, so the cell fell straight back to the CACHED value -- the old
 * price -- and stayed there for the second or so the round trip to the server takes. Typing
 * 6000, pressing save, and watching the cell go back to 5200 reads as a rejected edit, and the
 * natural response is to type it again.
 *
 * So the cache is updated first and the request is sent after. If the server refuses, the
 * snapshot goes back and the toast explains why; that is the rare case, and it is the one that
 * should cost a moment rather than every successful edit costing one.
 */
export const useUpdateVariant = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateVariant(id, data),

    onMutate: async ({ id, data }: { id: string; data: any }) => {
      const key = queryKeys.variants(productId);
      // An in-flight refetch would land after this and undo it.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old: any) => {
        if (!old) return old;
        const patch = (v: any) => (v?.id === id ? { ...v, ...data } : v);
        // The endpoint has been returning both a bare array and a { data: [...] } envelope at
        // different times, so patch whichever shape is actually in the cache rather than
        // assuming one and silently doing nothing.
        if (Array.isArray(old)) return old.map(patch);
        if (Array.isArray(old?.data)) return { ...old, data: old.data.map(patch) };
        return old;
      });

      return { previous, key };
    },

    onError: (error: any, _vars, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
      toast.error(error.message || 'Failed to update variant');
    },

    onSuccess: () => {
      toast.success('Variant updated successfully');
    },

    // Whatever happened, reconcile with the server -- the optimistic patch only covers the
    // fields that were sent, and a receipt or another user's edit may have moved others.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
      invalidateDerivedViews(queryClient); // variant count + inventory value
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
