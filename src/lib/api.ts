/// <reference types="vite/client" />
import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required to send HttpOnly cookies
  // No timeout was set, so axios defaulted to none and every request in the app could hang
  // for ever. That is not theoretical: publishing a product created the product, then awaited
  // an image upload that never settled, leaving the button spinning "SAVING..." on a page the
  // user could not leave -- with the success toast already shown and the only apparent escape
  // being to press publish again and create a duplicate.
  //
  // Deliberately generous rather than tight. This backend averages well over a second per
  // round trip and some endpoints do real work per item (bulk variant creation, drafting a
  // purchase order per supplier), so a short timeout would turn slow-but-working into
  // broken. 90s is far longer than any healthy request here and still turns "hangs for ever"
  // into an error the user can act on.
  timeout: 90000
});

// Must match AuthContext.jsx's STORAGE_KEY — this used to be a different string
// ('scaleezy_auth'), so the 401 handler below was clearing a localStorage key nobody
// ever wrote to, leaving the real stored user behind until the next session check.
/**
 * Pages a signed-out visitor is entitled to see.
 *
 * An explicit list rather than something inferred, because being wrong in the other direction
 * is worse: a page that DOES need a session but is listed here would leave someone staring at
 * a broken screen instead of being asked to sign in. Add a path only when the page genuinely
 * works with nobody logged in.
 */
const PUBLIC_PATHS = ['/', '/login', '/signup'];

const STORAGE_KEY = 'scaleezy_auth_user';
export const LOCATION_STORAGE_KEY = 'scaleezy_location_id';

export function getStoredLocationId(): string | null {
  return localStorage.getItem(LOCATION_STORAGE_KEY);
}

api.interceptors.request.use(
  (config) => {
    const locationId = getStoredLocationId();
    if (locationId) {
      config.headers['x-location-id'] = locationId;
    }
    // Token and ClientID are now securely managed by cookies and the Auth Layer!
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Our backend wraps responses in { success, data, meta }
    // We can unwrap it here for convenience if desired, but
    // to preserve meta, we'll return the whole response.data
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // The Platform Admin console is a completely separate auth realm (its own cookie,
      // its own login page) -- a 401 there (e.g. an unauthenticated session check on
      // mount) must never bounce the visitor into the client-facing /login page, and
      // must never clear the unrelated client auth storage key.
      if (window.location.pathname.startsWith('/platformconsole')) {
        return Promise.reject(error.response?.data || error);
      }

      // Nor from a page that never required a session in the first place.
      //
      // The landing page runs a session check on mount, as every page does. For a visitor who
      // has never signed in, that check correctly returns 401 -- and this handler was reading
      // it as "your session expired" and sending them to /login. So every prospective customer
      // who opened the marketing site was thrown to a login screen before reading a word of
      // it, and the only people who could see the sales pitch were the ones who had already
      // bought.
      //
      // A 401 on a public page is the expected answer, not a failure: it means nobody is
      // signed in, which those pages are built to handle themselves.
      if (PUBLIC_PATHS.some(p => window.location.pathname === p)) {
        return Promise.reject(error.response?.data || error);
      }

      // Session was rejected/expired — send the user back to login.
      localStorage.removeItem(STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // A timeout has no error.response, so it would otherwise reject with a raw axios error
    // whose message is "timeout of 90000ms exceeded" -- accurate, and meaningless to a shop
    // owner. Give it the same { message } shape every caller already reads.
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'The server took too long to respond. Check your connection and try again.'
      });
    }

    // Likewise for a request that never reached the server at all.
    if (!error.response && error.code === 'ERR_NETWORK') {
      return Promise.reject({
        message: 'Could not reach the server. Check your connection and try again.'
      });
    }

    // Handle global API errors (e.g., 401 Unauthorized)
    return Promise.reject(error.response?.data || error);
  }
);

export { api };
