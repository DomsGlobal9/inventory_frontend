import axios from 'axios';
import { api } from '../lib/api';

/**
 * Product image upload.
 *
 * The storage path is decided by the SERVER, not here. This used to build
 * `${clientId}/${productId}/${file}` in the browser and write straight to Supabase with
 * the anon key -- which put the tenant boundary in the client's hands. The anon key
 * carries no identity, so no storage policy could check it either: any client could name
 * another boutique's folder and write into it.
 *
 * Now the flow is:
 *   1. ask the backend to prepare an upload  (it derives the path from the JWT's tenant)
 *   2. PUT the bytes to the signed URL it returns (single-use, scoped to that exact path)
 *   3. register the image, echoing back the path the SERVER generated
 *
 * The frontend never sees or supplies a clientId, which is why uploadImageFile no longer
 * takes one -- and because the signed URL is already fully authorised, the upload is a
 * plain PUT. That removes the last reason for this app to hold Supabase credentials at
 * all: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are no longer needed, so the anon key
 * is no longer published in the JavaScript bundle.
 */
export async function uploadImageFile(productId: string, file: File, opts: {
  isPrimary?: boolean;
  altText?: string;
  imageType?: 'COVER' | 'GALLERY' | 'RAW_UPLOAD';
  orderIndex?: number;
} = {}) {
  // 1. Server computes the path and signs a one-time upload for it.
  const prepared: any = await api.post(`/products/${productId}/images/upload-url`, {
    fileName: file.name
  });
  const { storagePath, signedUrl, publicUrl } = prepared?.data ?? prepared;

  if (!storagePath || !signedUrl) {
    throw new Error('Could not prepare the upload. Please try again.');
  }

  // 2. The signed URL carries its own authorisation for this one path, so this is a plain
  //    PUT with no credentials attached. `api` is deliberately not used here: it points at
  //    our own backend and would attach session cookies to a third-party origin.
  const putResponse = await axios.put(signedUrl, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    validateStatus: () => true
  });

  if (putResponse.status < 200 || putResponse.status >= 300) {
    throw new Error(`Failed to upload image to storage (HTTP ${putResponse.status})`);
  }

  // 3. Register it. storagePath is the server's own value round-tripped; addImage
  //    additionally rejects any path outside this tenant + product prefix.
  return api.post(`/products/${productId}/images`, {
    url: publicUrl,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    altText: opts.altText || file.name,
    isPrimary: opts.isPrimary || false,
    imageType: opts.imageType || 'GALLERY',
    orderIndex: opts.orderIndex ?? 0
  });
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
