import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';

export default function ProtectedRoute({ requiredRole, requiredPermission }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user) {
    if (user.roles?.includes('SUPER_ADMIN')) {
      // SUPER_ADMIN bypass
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
