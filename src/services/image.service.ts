import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

// Structure: inventory-images/{clientId}/{productId}/{timestamp}_{filename}
// Matches the bucket/path convention the backend's image.service.ts expects when
// cleaning up storage on delete -- keep them in sync if this ever changes.
export async function uploadImageFile(productId: string, clientId: string, file: File, opts: {
  isPrimary?: boolean;
  altText?: string;
  imageType?: 'COVER' | 'GALLERY' | 'RAW_UPLOAD';
  orderIndex?: number;
} = {}) {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storagePath = `${clientId}/${productId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('inventory-images')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload image to storage');
  }

  const { data: publicUrlData } = supabase.storage.from('inventory-images').getPublicUrl(storagePath);
  const url = publicUrlData.publicUrl;

  const payload = {
    url,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    altText: opts.altText || file.name,
    isPrimary: opts.isPrimary || false,
    imageType: opts.imageType || 'GALLERY',
    orderIndex: opts.orderIndex ?? 0
  };

  return api.post(`/products/${productId}/images`, payload);
}

// Converts a base64 data: URL (e.g. from the Catalog Try-On generator) into a File
// suitable for uploadImageFile.
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
