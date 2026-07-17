import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import PageLoader from '../../components/PageLoader';

export default function CuisineGate() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return <PageLoader message="Chargement..." />;

  if (!isAuthenticated || user?.role !== 'cuisinier') {
    return <Navigate to="/login?next=/cuisine/app" replace />;
  }

  if (user.banned) {
    return <Navigate to="/login?next=/cuisine/app" replace />;
  }

  return <Outlet />;
}
