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
export interface ImageOpts {
  isPrimary?: boolean;
  altText?: string;
  imageType?: 'COVER' | 'GALLERY' | 'RAW_UPLOAD';
  orderIndex?: number;
  /** Which size/colour this photograph is of. Omitted for a shot of the product as a whole. */
  variantId?: string;
  /** True when Try-On made this picture rather than the shop photographing it. */
  generated?: boolean;
  /** The flat-lay a generated view was made from, so "where did this come from" has an answer. */
  generatedFromId?: string;
}

/**
 * Puts the bytes in storage and hands back where they landed, WITHOUT registering them
 * against anything.
 *
 * Split out from uploadImageFile because one photograph of the red saree belongs to every
 * red variant -- red/S, red/M, red/L -- and uploading the same file once per size would
 * send the same bytes over a shop's connection three times and leave three copies in
 * storage. The bytes go up once; registerImage then points as many variants at them as
 * the colour has sizes.
 */
export async function putImageBytes(productId: string, file: File) {
  const prepared: any = await api.post(`/products/${productId}/images/upload-url`, { fileName: file.name });
  const { storagePath, signedUrl, publicUrl } = prepared?.data ?? prepared;

  if (!storagePath || !signedUrl) throw new Error('Could not prepare the upload. Please try again.');

  const putResponse = await axios.put(signedUrl, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    validateStatus: () => true,
    timeout: 120000
  });
  if (putResponse.status < 200 || putResponse.status >= 300) {
    throw new Error(`Failed to upload image to storage (HTTP ${putResponse.status})`);
  }
  return { storagePath, publicUrl, fileName: file.name, fileSize: file.size };
}

/**
 * Records a photograph that is already in storage against a product, and optionally one
 * of its variants.
 *
 * Several rows may share one storagePath -- that is how one photograph of a colour covers
 * every size of it. Deleting a row removes the file from storage only when it was the last
 * row using that path (see the backend's deleteImage), so a shop removing red/M's copy
 * does not blank red/S.
 */
export async function registerImage(
  productId: string,
  stored: { storagePath: string; publicUrl: string; fileName?: string; fileSize?: number },
  opts: ImageOpts = {}
) {
  return api.post(`/products/${productId}/images`, {
    url: stored.publicUrl,
    storagePath: stored.storagePath,
    fileName: stored.fileName,
    fileSize: stored.fileSize,
    altText: opts.altText || stored.fileName,
    isPrimary: opts.isPrimary || false,
    imageType: opts.imageType || 'GALLERY',
    orderIndex: opts.orderIndex ?? 0,
    generated: opts.generated ?? false,
    // Both omitted rather than sent as null: the schema treats a key's absence as "not set",
    // and a null would have to be allowed through validation to mean the same thing.
    ...(opts.generatedFromId ? { generatedFromId: opts.generatedFromId } : {}),
    ...(opts.variantId ? { variantId: opts.variantId } : {})
  });
}

/**
 * The ordinary one-photograph case: put the bytes up and record them in one go.
 *
 * Kept as the single call most screens want, but built from putImageBytes + registerImage
 * rather than repeating them -- two copies of the upload sequence is two places for the
 * tenant-path rule to drift.
 */
export async function uploadImageFile(productId: string, file: File, opts: ImageOpts = {}) {
  const stored = await putImageBytes(productId, file);
  return registerImage(productId, stored, opts);
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
