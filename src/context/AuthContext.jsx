import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api';

const STORAGE_KEY = 'scaleezy_auth';
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password, clientId: CLIENT_ID });
    const { token, user } = response.data;
    const nextAuth = { token, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  const value = {
    token: auth?.token || null,
    user: auth?.user || null,
    roles: auth?.user?.roles || [],
    permissions: auth?.user?.permissions || [],
    isAuthenticated: !!auth?.token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Non-hook accessors so lib/api.ts (outside React) can read/clear the token.
export function getStoredToken() {
  return readStoredAuth()?.token || null;
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
