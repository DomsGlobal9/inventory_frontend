/**
 * The shop's logo as a PNG data URL, ready for a PDF.
 *
 * @react-pdf draws PNG and JPG only, and the logo screen accepts any image -- SVG and WebP
 * included -- so the file is redrawn onto a canvas and exported as PNG first. It is also scaled
 * down: a 2MB photograph embedded at full size makes every purchase order a 2MB download.
 *
 * Fetched as a blob and drawn from a local object URL, so the canvas is never tainted by the
 * storage host and toDataURL cannot throw a security error. Any failure resolves to null and the
 * document prints the shop's name without a logo, rather than not printing at all.
 */

const cache = new Map();
const MAX_SIDE = 360;

export function logoAsPng(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    const job = convert(url).catch(() => null);
    cache.set(url, job);
    // A failure is not remembered: the next document tries again, in case it was the network.
    job.then(result => { if (!result) cache.delete(url); });
  }
  return cache.get(url);
}

async function convert(url) {
  const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
  if (!response.ok) return null;
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    // An SVG with no intrinsic size reports 0 x 0; draw it square rather than not at all.
    const width = image.naturalWidth || MAX_SIDE;
    const height = image.naturalHeight || MAX_SIDE;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
