/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4006/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    if (clientId) {
      config.headers['x-client-id'] = clientId;
    }
    // In the future, JWT tokens can be injected here
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
    // Handle global API errors (e.g., 401 Unauthorized)
    return Promise.reject(error.response?.data || error);
  }
);

export { api };
