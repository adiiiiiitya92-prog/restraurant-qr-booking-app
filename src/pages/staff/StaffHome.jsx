import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

// Start page of the installed app: sends each person to their own screen.
export function StaffHome() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Opening Junio 8..." />
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={userRole === 'admin' ? '/admin' : '/kitchen'} replace />;
}
