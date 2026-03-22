import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import MaintenancePage from '../pages/MaintenancePage';
import PageLoader from './PageLoader';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ALLOWED_PREFIXES = ['/dashboard'];
const ALLOWED_EXACT = ['/login', '/register', '/loading', '/welcome', '/location'];

function pathIsAllowed(pathname) {
  if (ALLOWED_EXACT.includes(pathname)) return true;
  return ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

const MaintenanceGate = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/app-settings/public`, { timeout: 12000 })
      .then((res) => {
        if (cancelled) return;
        setMaintenanceEnabled(!!res.data?.maintenanceEnabled);
        setMaintenanceMessage(res.data?.maintenanceMessage || '');
      })
      .catch(() => {
        if (cancelled) return;
        setMaintenanceEnabled(false);
        setMaintenanceMessage('');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showMaintenance = useMemo(() => {
    if (!maintenanceEnabled) return false;
    return !pathIsAllowed(location.pathname);
  }, [maintenanceEnabled, location.pathname]);

  if (loading) {
    return <PageLoader message="" />;
  }

  if (showMaintenance) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  return children;
};

export default MaintenanceGate;
