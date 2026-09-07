import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { usePlatformAdmin } from '../context/PlatformAdminContext';

import PageLoader from '../components/PageLoader';

export default function AdminProtectedRoute() {
  const { admin, isLoading } = usePlatformAdmin();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader text="VERIFYING SESSION..." fullScreen />;
  }

  if (!admin) {
    return <Navigate to="/platformconsole/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
