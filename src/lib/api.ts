/// <reference types="vite/client" />
import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required to send HttpOnly cookies
});

// Must match AuthContext.jsx's STORAGE_KEY — this used to be a different string
// ('scaleezy_auth'), so the 401 handler below was clearing a localStorage key nobody
// ever wrote to, leaving the real stored user behind until the next session check.
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
      // Session was rejected/expired — send the user back to login.
      localStorage.removeItem(STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // Handle global API errors (e.g., 401 Unauthorized)
    return Promise.reject(error.response?.data || error);
  }
);

export { api };
