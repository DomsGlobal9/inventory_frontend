import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { holdsEverything } from '../lib/authority';
import { LocationProvider } from '../contexts/LocationContext';

import PageLoader from '../components/PageLoader';
import NoAccess from './NoAccess';

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
      // Refused in place, keeping the URL, rather than redirected to /unauthorized.
      //
      // A redirect throws away what they were trying to reach, so the back button returns them
      // to the same refusal and the address bar no longer says where they were going. Staying
      // put means a role that gains the permission later can simply reload.
      if (requiredRole && !user.roles?.includes(requiredRole)) {
        return <NoAccess variant="page" message="This part of the app isn't part of your role." />;
      }
      if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
        return <NoAccess variant="page" message="This part of the app isn't part of your role. Ask whoever manages your team if you need it." />;
      }
    }
  }

  return (
    <LocationProvider>
      <Outlet />
    </LocationProvider>
  );
}
