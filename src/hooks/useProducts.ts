import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductById, createProduct, updateProduct, archiveProduct, trashProduct, restoreProduct, hardDeleteProduct } from '../services/product.service';
import { queryKeys } from '../lib/queryKeys';
import { toast } from 'react-hot-toast';

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
      toast.success('Product created successfully');
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
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(describeError(error, 'Failed to update product'));
    }
  });
};

export const useArchiveProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product archived successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive product');
    }
  });
};

export const useTrashProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trashProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product moved to trash');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to move product to trash');
    }
  });
};

export const useRestoreProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product restored successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to restore product');
    }
  });
};

export const useHardDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hardDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product permanently deleted');
    },
    onError: (error: any) => {
      // Show backend reason in toast
      const msg = error.response?.data?.message || error.message || 'Failed to permanently delete product';
      toast.error(msg);
    }
  });
};
