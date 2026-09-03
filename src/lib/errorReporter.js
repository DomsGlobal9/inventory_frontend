// Deliberately raw fetch, not the `api` axios instance: this must still work when axios
// itself, React, or the rest of the app is the thing that's broken. Never throws, never
// awaited by callers -- a failed error report must not become a second error.
import { API_BASE_URL } from './config';

const ENDPOINT = `${API_BASE_URL}/client-errors`;

// A crash loop (e.g. a render error that retriggers on every re-render attempt) must not
// turn into a flood of identical reports -- cap it per page load.
let reportCount = 0;
const MAX_REPORTS_PER_LOAD = 20;

// Returns a promise resolving to the created ClientErrorLog id (or null on any failure) so
// a crash screen can offer "Report this issue" pre-linked to the exact error that happened.
export function reportClientError({ message, stack }) {
  if (!message) return Promise.resolve(null);
  if (reportCount >= MAX_REPORTS_PER_LOAD) return Promise.resolve(null);
  reportCount++;

  try {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 8000) : undefined,
        route: window.location?.pathname,
        userAgent: navigator?.userAgent
      })
    })
      .then(res => res.status === 201 ? res.json() : null)
      .then(json => json?.data?.id || null)
      .catch(() => null);
  } catch {
    // Reporting a crash must never itself crash.
    return Promise.resolve(null);
  }
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => {
    reportClientError({ message: event.message, stack: event.error?.stack });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError({
      message: reason?.message || String(reason),
      stack: reason?.stack
    });
  });
}
