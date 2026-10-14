import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { holdsEverything } from '../lib/authority';

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
        // /auth/session returns the tenant separately as client.id; it used to be thrown
        // away, leaving the app with no idea which tenant it was acting for. Fold it into
        // the stored user so there is exactly one place to read it from.
        const hydrated = { ...res.user, clientId: res.user.clientId ?? res.client?.id ?? null };
        setUser(hydrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
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

  /*
   * Permissions change while people work: the owner edits a role, or moves someone to another one.
   * Read them again when the tab comes back into view, every five minutes while it is open, and at
   * once when the server refuses something for a missing permission -- so the screen shows what the
   * person may do NOW. Quiet: a failed refresh changes nothing (a real sign-out arrives as a 401,
   * which the api client already handles), and an unchanged answer does not re-render the app.
   */
  useEffect(() => {
    let busy = false;
    const refresh = async () => {
      if (busy || !readStoredUser()) return;
      busy = true;
      try {
        const res = await api.get('/auth/session');
        if (res?.authenticated && res.user) {
          const hydrated = { ...res.user, clientId: res.user.clientId ?? res.client?.id ?? null };
          setUser(prev => {
            const same = prev && JSON.stringify([prev.permissions, prev.roles]) === JSON.stringify([hydrated.permissions, hydrated.roles]);
            if (same) return prev;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
            return hydrated;
          });
        }
      } catch { /* offline or slow: keep what we have */ } finally { busy = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('scaleezy:permissions-stale', refresh);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 5 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('scaleezy:permissions-stale', refresh);
      clearInterval(timer);
    };
  }, []);

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
    // A basket being rung up is saved in the browser so a reload keeps it. On a shared till the next
    // person to sign in must not find the last customer's name, number and items waiting for them.
    try {
      Object.keys(localStorage).filter(k => k.startsWith('scaleezy:new-sale:')).forEach(k => localStorage.removeItem(k));
    } catch { /* storage unavailable: nothing was saved either */ }
    setUser(null);
  }, []);

  const value = {
    user,
    // The authenticated tenant. Anything that scopes data by tenant must read it from
    // here -- never from a build-time constant, which is identical for every customer.
    clientId: user?.clientId || null,
    roles: user?.roles || [],
    permissions: user?.permissions || [],
    // Single source of truth for "can this user do X", so screens stop showing buttons
    // that the backend will only reject. The owner's '*' grant passes everything, matching
    // how requirePermission resolves it server-side.
    hasPermission: (permission) =>
      holdsEverything(user) || (user?.permissions || []).includes(permission),
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

