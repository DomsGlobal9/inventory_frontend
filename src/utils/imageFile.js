/**
 * Is this file a picture?
 *
 * `file.type.startsWith('image/')` is the obvious test and it rejects real photographs.
 * A capture straight from the camera on iOS arrives with type "application/octet-stream"
 * or with no type at all -- the browser never sniffed it, because it did not come from
 * disk. The same happens with some Android pickers and with files dragged out of certain
 * apps. The user has just taken a photo of a garment, and the box quietly ignores it.
 *
 * So: trust the type when there is one, and fall back to the extension when there is not.
 * A file called IMG_4021.HEIC with no MIME type is a photo; treating it as "not an image"
 * because the browser declined to guess is the app being pedantic at the user's expense.
 *
 * Deliberately permissive. The server validates what it is actually sent; this only decides
 * whether the browser bothers to offer it, and the cost of a false accept is an error
 * message, while the cost of a false reject is a button that does nothing.
 */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif|tiff?)$/i;

export function isImageFile(file) {
  if (!file) return false;

  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;

  // No type, or the generic one a camera capture comes through with.
  if (!type || type === 'application/octet-stream') {
    return IMAGE_EXTENSIONS.test(String(file.name || ''));
  }

  return false;
}

/**
 * Only the files worth keeping, in order.
 */
export function imageFilesFrom(fileList) {
  return Array.from(fileList || []).filter(isImageFile);
}
