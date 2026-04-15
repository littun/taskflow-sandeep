import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-primary" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
