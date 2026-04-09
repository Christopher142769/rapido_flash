import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import PageLoader from './PageLoader';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <PageLoader message="Vérification de l'authentification..." />;
  }

  if (isAuthenticated) return children;
  const nextPath = `${location.pathname}${location.search || ''}`;
  return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
};

export default PrivateRoute;
