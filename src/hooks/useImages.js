import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { uploadImageFile } from '../services/image.service';
import { queryKeys } from '../lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * The product's own record counts photographs too.
 *
 * Its detail response carries imageCount and variantsWithoutImages, and the header shows the
 * second of those in red. Invalidating only the image list left that badge saying "2 variants
 * have no image" on a page whose gallery had already updated to "1 of 2" -- the two halves of
 * one screen disagreeing, which is worse than either being wrong alone.
 */
const invalidateProductPhotoCounts = (queryClient, productId) => {
  queryClient.invalidateQueries({ queryKey: ['images', productId] });
  queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.products });
  // The Variants tab marks each size and colour that has no photograph, and it reads its own
  // query. Four places now count photographs; every one of them has to be told, or two tabs of
  // the same page disagree about the same saree.
  queryClient.invalidateQueries({ queryKey: queryKeys.variants(productId) });
};

// GET images for a product
export function useImages(productId) {
  return useQuery({
    queryKey: ['images', productId],
    queryFn: async () => {
      const response = await api.get(`/products/${productId}/images`);
      return response.data;
    },
    enabled: !!productId,
  });
}

// UPLOAD image to Supabase and POST to backend
export function useUploadImage(productId) {
  const queryClient = useQueryClient();
  return useMutation({
    /*
     * imageType is an argument now, not a constant.
     *
     * Everything uploaded here used to become a GALLERY photo, which is right for a picture the
     * shop wants customers to see and wrong for a flat-lay handed over purely to generate the
     * catalogue views from. There was no way to say which, so a shop that uploaded a flat-lay
     * after publishing put a photograph of cloth on a table into their own shop window, with no
     * way back other than deleting it.
     */
    mutationFn: async ({ file, isPrimary = false, altText = '', variantId, imageType = 'GALLERY' }) => {
      // No tenant is passed: the server derives the storage path from the session's JWT.
      const response = await uploadImageFile(productId, file, { isPrimary, altText, imageType, variantId });
      return response.data;
    },
    /*
     * `silent` exists for the batch: picking five photographs at once used to mean five identical
     * success toasts stacked up the screen. The gallery says "5 photos added" once instead.
     */
    onSuccess: (_data, vars) => {
      invalidateProductPhotoCounts(queryClient, productId);
      if (!vars?.silent) toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload image');
    }
  });
}

// PATCH update image (reorder, set primary, alt text)
export function useUpdateImage(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, data }) => {
      // Mounted under product.routes.ts as /products/images/:id, not a top-level /images route.
      const response = await api.patch(`/products/images/${imageId}`, data);
      return response.data;
    },
    onSuccess: () => {
      invalidateProductPhotoCounts(queryClient, productId);
    },
    onError: () => {
      toast.error('Failed to update image');
    }
  });
}

// DELETE image
export function useDeleteImage(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId) => {
      const response = await api.delete(`/products/images/${imageId}`);
      return response.data;
    },
    onSuccess: () => {
      invalidateProductPhotoCounts(queryClient, productId);
      toast.success('Image deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete image');
    }
  });
}
