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

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
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
      toast.error(error.message || 'Failed to update product');
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
