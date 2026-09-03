/**
 * Single source of truth for runtime configuration.
 *
 * `http://localhost:4006/api/v1` used to be duplicated as a fallback in three separate
 * files (api.ts, errorReporter.js, GarmentPhotoshootUploader.jsx). If VITE_API_URL were
 * ever missing from a production build, the deployed app would quietly call localhost --
 * every request failing in the browser with a network error that says nothing about the
 * real cause, on a site that looks like it loaded fine.
 *
 * VITE_* values are inlined at BUILD time, so a missing one cannot be corrected at
 * runtime: the bundle is simply wrong and must be rebuilt. Failing loudly is therefore the
 * only honest option -- the app is completely non-functional without an API either way,
 * and this at least names the reason in the console instead of leaving 40 failed requests
 * to be reverse-engineered.
 *
 * The localhost default is kept for local development only, where it is genuinely correct.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (!configuredApiUrl && import.meta.env.PROD) {
  const message =
    'VITE_API_URL is not set. This build cannot reach any backend. ' +
    'Set it on the hosting provider (including the /api/v1 path, no trailing slash) and rebuild.';
  console.error(`[config] ${message}`);
  throw new Error(message);
}

export const API_BASE_URL = configuredApiUrl || 'http://localhost:4006/api/v1';
