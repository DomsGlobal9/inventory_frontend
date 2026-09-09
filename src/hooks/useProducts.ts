import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductById, createProduct, updateProduct, archiveProduct, trashProduct, restoreProduct, hardDeleteProduct } from '../services/product.service';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'react-hot-toast';
import { invalidateDerivedViews } from '../lib/invalidate';

export const useProducts = (params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.products, params],
    queryFn: () => getProducts(params),
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
};

// The backend's Zod validation failures come back as { message: "Validation failed",
// errors: [{ path: ["title"], message: "Title is required" }, ...] } -- the generic
// top-level `message` alone told the user nothing actionable. Surface the specific
// field errors instead.
function describeError(error: any, fallback: string): string {
  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    return error.errors.map((e: any) => e.message).filter(Boolean).join('; ');
  }
  return error?.message || fallback;
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      invalidateDerivedViews(queryClient); // active-product count + inventory value
      // Deliberately no toast here. Creating the product row is the FIRST step of publishing,
      // not the end of it -- its variants and their opening stock are created afterwards, and
      // React Query keeps the mutation pending while that runs. Announcing success here put a
      // "Product created successfully" toast on screen while the button was still spinning
      // through the rest, which reads as the app having hung after saying it was done. The
      // one confirmation is raised by the caller when the whole sequence has finished.
    },
    onError: (error: any) => {
      toast.error(describeError(error, 'Failed to create product'));
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(variables.id) });
      invalidateDerivedViews(queryClient); // active-product count + inventory value
      // As with create: the caller confirms once the whole save has finished, not partway.
    },
    onError: (error: any) => {
      toast.error(describeError(error, 'Failed to update product'));
    }
  });
};


/**
 * Move a product between its states on screen, on BOTH of the caches that show it.
 *
 * The list is keyed ['products'] and the detail ['product', id] -- different roots, so the
 * invalidateQueries({ queryKey: queryKeys.products }) that every one of these four mutations
 * relied on never touched the detail. Proven on the running app: archiving from the product
 * page returned 200, the database said ARCHIVED, and ten seconds later the page was still
 * headed DRAFT and still offering an Archive button. The only way to see the result of
 * archiving a product was to leave the page.
 *
 * On top of that all four waited for the round trip before anything moved at all, on a
 * database that answers in seconds. Archiving, trashing, restoring and deleting are the
 * actions where a screen that does not react is most alarming -- the natural reading of
 * "nothing happened" is that it did not work, and the natural response is to press again.
 *
 * So: the status changes on the page now, and the row leaves whichever list is on screen now
 * -- it belongs to a different tab the moment its status changes. Everything is snapshotted
 * so a refusal puts it all back, and onSettled refetches both roots to get the counts,
 * inventory value and tab contents from the server rather than guessing them here.
 */
const patchProductState = (
  queryClient: any,
  id: string,
  status: string | null
) => {
  const detailKey = queryKeys.product(id);
  const previousDetail = queryClient.getQueryData(detailKey);

  if (status) {
    queryClient.setQueryData(detailKey, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: { ...old.data, status } };
    });
  }

  // Every cached list, not just the one in view: the same product can sit in several
  // (different page sizes, different filters), and leaving it in the others means seeing it
  // reappear on the next tab switch.
  const previousLists: any[] = [];
  queryClient.setQueriesData({ queryKey: queryKeys.products }, (old: any) => {
    if (!old?.data || !Array.isArray(old.data)) return old;
    previousLists.push(old);
    return { ...old, data: old.data.filter((row: any) => row?.id !== id) };
  });

  return { detailKey, previousDetail, previousLists };
};

/** Put back everything patchProductState changed, when the server refuses. */
const undoProductState = (queryClient: any, context: any) => {
  if (!context) return;
  if (context.previousDetail !== undefined) {
    queryClient.setQueryData(context.detailKey, context.previousDetail);
  }
  if (context.previousLists?.length) {
    let i = 0;
    queryClient.setQueriesData({ queryKey: queryKeys.products }, () => context.previousLists[i++]);
  }
};

/** Both roots, because they are separate and both are stale after any of this. */
const refreshProducts = (queryClient: any, id: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.products });
  queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
  invalidateDerivedViews(queryClient); // active-product count + inventory value
};

export const useArchiveProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveProduct,
    onMutate: (id: string) => patchProductState(queryClient, id, 'ARCHIVED'),
    onError: (error: any, _id, context) => {
      undoProductState(queryClient, context);
      toast.error(error.message || 'Failed to archive product');
    },
    onSuccess: () => toast.success('Archived. You can restore it from the Archived tab.'),
    onSettled: (_d, _e, id: string) => refreshProducts(queryClient, id)
  });
};

export const useTrashProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trashProduct,
    onMutate: (id: string) => patchProductState(queryClient, id, 'TRASHED'),
    onError: (error: any, _id, context) => {
      undoProductState(queryClient, context);
      toast.error(error.message || 'Failed to move product to trash');
    },
    onSuccess: () => toast.success('Moved to trash. You can put it back from the Trash tab.'),
    onSettled: (_d, _e, id: string) => refreshProducts(queryClient, id)
  });
};

export const useRestoreProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreProduct,
    // Restoring returns a product to whatever it was BEFORE, which the server keeps in
    // previousStatus -- and the detail cache already holds that field, so it can be read
    // rather than guessed. When it is genuinely absent (a product archived before the server
    // started recording it) nothing is claimed and the refetch settles it: this is the field
    // that decides whether a product is on sale, and the one thing worse than a slow answer
    // is a confident wrong one.
    onMutate: (id: string) => {
      const cached: any = queryClient.getQueryData(queryKeys.product(id));
      const previous = cached?.data?.previousStatus ?? null;
      return patchProductState(queryClient, id, previous);
    },
    onError: (error: any, _id, context) => {
      undoProductState(queryClient, context);
      toast.error(error.message || 'Failed to restore product');
    },
    onSuccess: () => toast.success('Restored. It is back with your other products.'),
    onSettled: (_d, _e, id: string) => refreshProducts(queryClient, id)
  });
};

export const useHardDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hardDeleteProduct,
    onMutate: (id: string) => patchProductState(queryClient, id, null),
    onError: (error: any, _id, context) => {
      undoProductState(queryClient, context);
      // api.ts rejects with the already-unwrapped response body, so the server's reason is on
      // `error` itself. The `error.response?.data?.message` this used to reach for first is
      // always undefined here -- it happened to fall through to the right place, but the next
      // person to copy the line somewhere less forgiving would not be so lucky.
      toast.error(error.message || 'Failed to permanently delete product');
    },
    onSuccess: () => toast.success('Deleted for good.'),
    onSettled: (_d, _e, id: string) => refreshProducts(queryClient, id)
  });
};
