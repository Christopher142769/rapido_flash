import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { toDashboardPath } from '../config/dashboardPath';
import Dashboard from '../pages/restaurant/Dashboard';

/** Redirige les commerciaux et cuisiniers vers leur espace dédié. */
export default function DashboardIndexRedirect() {
  const { user } = useContext(AuthContext);
  if (user?.role === 'commercial') {
    return <Navigate to={toDashboardPath('/commercial')} replace />;
  }
  if (user?.role === 'responsable') {
    return <Navigate to={toDashboardPath('/commercial-commandes')} replace />;
  }
  if (user?.role === 'cuisinier') {
    return <Navigate to="/cuisine/app" replace />;
  }
  return <Dashboard />;
}
