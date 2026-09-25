/**
 * Talking to the catalog service, in one place.
 *
 * There are two callers now -- the shop photographing a colour, and the shop asking for that
 * photograph in its other colours -- and they must not grow two copies of the stream reader.
 * A server-sent stream has three quiet traps in it, and getting any of them wrong in only one
 * of the two copies is the kind of bug that shows up months later in whichever path is used
 * less: keepalive lines that are not events, views that finish out of order, and a frame that
 * arrives split across two network chunks.
 */
import { API_BASE_URL } from './config';

export const VIEW_ORDER = ['front', 'left', 'right', 'back'];

/** The far end's view names are not ours 1:1. */
export const API_VIEW_TO_LOCAL = { front: 'front', sitting: 'left', side: 'right', back: 'back' };

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// The Try-On API only supports these 5 garment families. Anything else (menswear,
// kids' sets, western wear, "Wedding"/"Salwar Suit Sets" and similar catch-alls) has
// no matching model and must never be offered AI generation -- silently defaulting
// those to KURTI (the old behavior) produced nonsense results for unrelated garments.
export function resolveTryOnCategory(dressType) {
  const dt = (dressType || "").toLowerCase();
  if (dt.includes("saree")) return "SAREE";
  if (dt.includes("anarkali")) return "ANARKALI";
  if (dt.includes("lehanga") || dt.includes("lehenga")) return "LEHANGA";
  if (dt.includes("sharara")) return "SHARARA";
  if (dt.includes("kurti") || dt.includes("kurta")) return "KURTI";
  return null; // no supported category -- caller must fall back to plain upload
}

// There are exactly 4 standardized models per category (per the Try-On API docs)
// and no per-model preview imagery is exposed, so we can't offer a real picker --
// pick one at random on every generation instead.
export function pickRandomModelId(category) {
  const index = Math.floor(Math.random() * 4) + 1;
  return `${category.toLowerCase()}${index}`;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load generated image'));
    img.src = dataUrl;
  });
}

/**
 * The far end occasionally returns one "view" as a contact sheet -- several near-identical
 * renders side by side on one backdrop -- instead of a single photograph. A real full-body
 * shot is portrait; a composite is landscape, roughly N times wider than one panel. When we
 * see that shape, assume N equal panels and keep the first.
 */
export async function keepFirstPoseOnly(dataUrl) {
  try {
    const img = await loadImage(dataUrl);
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio <= 1.15) return dataUrl; // normal portrait shot, nothing to crop

    const panelCount = Math.round(ratio / 0.75) || 1; // ~0.75 = typical single-pose portrait ratio
    if (panelCount <= 1) return dataUrl;

    const panelWidth = Math.floor(img.naturalWidth / panelCount);
    const canvas = document.createElement('canvas');
    canvas.width = panelWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, panelWidth, img.naturalHeight, 0, 0, panelWidth, img.naturalHeight);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return dataUrl; // rather the original than nothing
  }
}

/** A photograph, shrunk to something sendable. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load ${file.name} for compression`));
    };
    img.src = objectUrl;
  });
}

/**
 * Run one generation and report what comes back.
 *
 * Resolves with the views collected, keyed by OUR view names. Throws on a refusal or a
 * failure part-way, with the far end's own words -- the caller decides what a person is
 * shown, because the wording that suits the photographs step is not the wording that suits
 * a list of colours being worked through.
 *
 * `onView` is called as each view lands, not at the end, so a screen can fill in as it goes:
 * the four take the better part of a minute and an empty box for all of it reads as broken.
 */
export async function streamCatalog({ payload, signal, onStatus, onView, onColour }) {
  const response = await fetch(`${API_BASE_URL}/catalog-tryon/generate-catalog`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Generation failed to start (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const collected = {};
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // A frame ends at a blank line. Whatever is after the last one is a partial frame still
    // arriving, so it is kept for the next chunk rather than parsed as if it were whole.
    const frames = buffer.split('\n\n');
    buffer = frames.pop();

    for (const frame of frames) {
      // A frame may carry comment lines -- ": keepalive 1757000000000" -- which are not events.
      // Scanned line by line rather than matched on the frame's first characters, so a keepalive
      // sharing a frame with a real event cannot hide it.
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue;

        let data;
        try { data = JSON.parse(line.slice(6)); } catch { continue; }

        if (data.type === 'STATUS') {
          onStatus?.(data.message);
        } else if (data.type === 'COLOR_VARIANT') {
          // What the far end understood the colour to be. Worth surfacing: the shop asked for
          // a hex and is shown a name, and the two should be seen to agree.
          onColour?.(data);
        } else if (data.type === 'VIEW_READY') {
          const key = API_VIEW_TO_LOCAL[data.view] || data.view;
          const clean = await keepFirstPoseOnly(data.image);
          collected[key] = clean;
          /*
           * AWAITED, deliberately.
           *
           * A caller may do real work here -- the product page uploads each view to storage and
           * registers it. Firing this and moving on meant all four uploads were still in flight
           * when COMPLETE arrived, so the caller refreshed the screen against a database that
           * had one of them. The photographs all arrived a moment later, but the shop had
           * already been shown "1 photo" and told it was done.
           *
           * Awaiting also makes the four uploads happen one after another rather than at once,
           * which is the order they should be stored in anyway.
           */
          await onView?.(key, clean);
        } else if (data.type === 'ERROR') {
          throw new Error(data.error || 'Generation failed');
        } else if (data.type === 'COMPLETE') {
          return collected;
        }
      }
    }
  }

  return collected;
}
