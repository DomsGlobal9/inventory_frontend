import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const PlatformAdminContext = createContext(undefined);

export const PlatformAdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await api.get('/auth/admin/session');
      setAdmin(res.admin);
    } catch (error) {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/admin/login', { email, password });
    setAdmin(res.data.admin);
    return res.data.admin;
  };

  const logout = async () => {
    await api.post('/auth/admin/logout');
    setAdmin(null);
  };

  return (
    <PlatformAdminContext.Provider value={{ admin, isLoading, login, logout, refresh: checkSession }}>
      {children}
    </PlatformAdminContext.Provider>
  );
};

export const usePlatformAdmin = () => {
  const ctx = useContext(PlatformAdminContext);
  if (!ctx) throw new Error('usePlatformAdmin must be used within a PlatformAdminProvider');
  return ctx;
};
