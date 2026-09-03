import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { usePlatformAdmin } from '../context/PlatformAdminContext';

export default function AdminProtectedRoute() {
  const { admin, isLoading } = usePlatformAdmin();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#888', background: '#0a0a0c' }}>Verifying platform admin session...</div>;
  }

  if (!admin) {
    return <Navigate to="/platformconsole/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
