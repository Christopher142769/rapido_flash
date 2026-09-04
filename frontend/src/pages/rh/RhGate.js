import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import PageLoader from '../../components/PageLoader';

export default function RhGate() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return <PageLoader message="Chargement…" />;

  if (!isAuthenticated || user?.role !== 'drh') {
    return <Navigate to="/login?next=/rh" replace />;
  }

  if (user.banned) {
    return <Navigate to="/login?next=/rh" replace />;
  }

  return <Outlet />;
}
