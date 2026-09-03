import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

const STORAGE_KEY = 'scaleezy_auth_user';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const res = await api.get('/auth/session');
      if (res.authenticated && res.user) {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password, clientId) => {
    // Just like any normal SaaS login: email + password, no workspace ID needed from
    // the visitor. `clientId` is only ever passed on the rare retry where the backend
    // reported the same email/password pair matches more than one workspace and the
    // visitor picked which one (see `requiresWorkspaceSelection` below).
    const response = await api.post('/auth/login', { email, password, ...(clientId ? { clientId } : {}) });

    if (response.requiresWorkspaceSelection) {
      return { requiresWorkspaceSelection: true, workspaces: response.workspaces };
    }

    const userData = response.data.user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = {
    user,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
    // Single source of truth for "can this user do X", so screens stop showing buttons
    // that the backend will only reject. SUPER_ADMIN is treated as holding everything,
    // matching how requirePermission resolves it server-side.
    hasPermission: (permission) =>
      (user?.roles || []).includes('SUPER_ADMIN') || (user?.permissions || []).includes(permission),
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    // Re-reads /auth/session and updates both state and localStorage. Without this,
    // saving a new profile name toasted "saved" while the header, the avatar initials
    // and Settings all kept rendering the old name until a full page reload.
    refreshUser: checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

