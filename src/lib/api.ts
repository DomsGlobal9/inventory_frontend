/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4006/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

const STORAGE_KEY = 'scaleezy_auth';
export const LOCATION_STORAGE_KEY = 'scaleezy_location_id';

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
}

export function getStoredLocationId(): string | null {
  return localStorage.getItem(LOCATION_STORAGE_KEY);
}

api.interceptors.request.use(
  (config) => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    if (clientId) {
      config.headers['x-client-id'] = clientId;
    }
    const locationId = getStoredLocationId();
    if (locationId) {
      config.headers['x-location-id'] = locationId;
    }
    const token = getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
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
    if (error.response?.status === 401 && getStoredToken()) {
      // Token was rejected/expired — drop it and send the user back to login.
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
