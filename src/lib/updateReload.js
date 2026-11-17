/**
 * An open tab after ScaleEzy is updated (17 Nov 2026).
 *
 * Every update gives the app's files new names. A tab opened before the update still asks for the old names the
 * first time it needs a part it has not loaded yet -- a Help page, the Excel reader -- and the old files are gone.
 * The person saw "Something went wrong" for doing nothing wrong (the live error log has it on 9 and 13 Nov, both
 * on Help pages). The cure is simply to load the page again, which fetches the new version: so that is done for
 * them, once.
 *
 * Once, and never in a loop: the time of the reload is remembered for this tab, and a second failure within a
 * minute is left to show as what it is (no internet, or a file really missing). When the tab cannot remember
 * anything (storage blocked), nothing is reloaded automatically at all.
 */
const KEY = 'scaleezy_update_reload_at';
const AGAIN_AFTER_MS = 60_000;
let reloading = false;

/** The browser's own words for "a part of the app could not be fetched", in each browser's spelling. */
export const isStaleFileError = (e) =>
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i
    .test(String(e?.message ?? e ?? ''));

/** True from the moment the page was told to load again until it does: nothing should be drawn over it meanwhile. */
export const isReloadingForUpdate = () => reloading;

/** Loads the page again to pick up the new version. False when that was already tried just now (or cannot be remembered). */
export function reloadForUpdate() {
  if (reloading) return true;
  try {
    const last = Number(window.sessionStorage.getItem(KEY)) || 0;
    if (Date.now() - last < AGAIN_AFTER_MS) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
    if (window.sessionStorage.getItem(KEY) === null) return false;
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

/**
 * Vite announces a part that failed to load before the error reaches the screen. The error itself is left to
 * carry on (stopping it here hands React an empty module, which it reports as a crash of its own): the error
 * screen and the error log both know these words and stay quiet while the page loads again.
 */
export function installUpdateReload() {
  window.addEventListener('vite:preloadError', () => { reloadForUpdate(); });
}
