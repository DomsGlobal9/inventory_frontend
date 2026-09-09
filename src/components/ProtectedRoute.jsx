import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { holdsEverything } from '../lib/authority';
import { LocationProvider } from '../contexts/LocationContext';

import PageLoader from '../components/PageLoader';

export default function ProtectedRoute({ requiredRole, requiredPermission }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader text="VERIFYING SESSION..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user) {
    if (holdsEverything(user)) {
      // The owner's '*' grant passes every route.
    } else {
      if (requiredRole && !user.roles?.includes(requiredRole)) {
        return <Navigate to="/unauthorized" replace />;
      }
      if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  return (
    <LocationProvider>
      <Outlet />
    </LocationProvider>
  );
}
