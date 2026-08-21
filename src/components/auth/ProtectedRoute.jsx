import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner text="Checking credentials..." />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    // Admin has full access to both admin and kitchen panels
    if (userRole === 'admin') {
      return children;
    }

    if (requiredRole === 'kitchen' && userRole === 'kitchen') {
      return children;
    }

    // Role mismatch
    return <Navigate to="/login" state={{ unauthorized: true, from: location }} replace />;
  }

  return children;
}
