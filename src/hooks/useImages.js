import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
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
  const clientId = import.meta.env.VITE_CLIENT_ID || 'demo-client'; // Using the same tenant logic

  return useMutation({
    mutationFn: async ({ file, isPrimary = false, altText = '' }) => {
      // 1. Upload to Supabase Storage
      // Structure: inventory-images/{clientId}/{productId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `${clientId}/${productId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inventory-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError);
        throw new Error(uploadError.message || "Failed to upload image to storage");
      }

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(storagePath);

      const url = publicUrlData.publicUrl;

      // 3. Save Metadata to Backend
      const payload = {
        url,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        altText: altText || file.name,
        isPrimary,
        imageType: 'GALLERY', // default
        orderIndex: 0
      };

      const response = await api.post(`/products/${productId}/images`, payload);
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
      const response = await api.patch(`/images/${imageId}`, data);
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
      const response = await api.delete(`/images/${imageId}`);
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
