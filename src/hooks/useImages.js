import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { uploadImageFile } from '../services/image.service';
import toast from 'react-hot-toast';

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
    mutationFn: async ({ file, isPrimary = false, altText = '' }) => {
      // No tenant is passed: the server derives the storage path from the session's JWT.
      const response = await uploadImageFile(productId, file, { isPrimary, altText, imageType: 'GALLERY' });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images', productId] });
      toast.success('Image uploaded successfully');
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
      queryClient.invalidateQueries({ queryKey: ['images', productId] });
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
      queryClient.invalidateQueries({ queryKey: ['images', productId] });
      toast.success('Image deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete image');
    }
  });
}
