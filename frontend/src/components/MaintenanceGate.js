import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import MaintenancePage from '../pages/MaintenancePage';
import DnsNoticePage from '../pages/DnsNoticePage';
import PageLoader from './PageLoader';
import { DASHBOARD_BASE_PATH } from '../config/dashboardPath';
import { hostnameMatchesDnsSourceDomain } from '../utils/dnsNoticeUrl';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ALLOWED_PREFIXES = ['/dashboard', DASHBOARD_BASE_PATH];
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
  const [dnsNoticeEnabled, setDnsNoticeEnabled] = useState(false);
  const [dnsNoticeSourceDomain, setDnsNoticeSourceDomain] = useState('');
  const [dnsNoticeUrl, setDnsNoticeUrl] = useState('');
  const [dnsNoticeMessage, setDnsNoticeMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/app-settings/public`, { timeout: 12000 })
      .then((res) => {
        if (cancelled) return;
        setMaintenanceEnabled(!!res.data?.maintenanceEnabled);
        setMaintenanceMessage(res.data?.maintenanceMessage || '');
        setDnsNoticeEnabled(!!res.data?.dnsNoticeEnabled);
        setDnsNoticeSourceDomain(res.data?.dnsNoticeSourceDomain || '');
        setDnsNoticeUrl(res.data?.dnsNoticeUrl || '');
        setDnsNoticeMessage(res.data?.dnsNoticeMessage || '');
      })
      .catch(() => {
        if (cancelled) return;
        setMaintenanceEnabled(false);
        setMaintenanceMessage('');
        setDnsNoticeEnabled(false);
        setDnsNoticeSourceDomain('');
        setDnsNoticeUrl('');
        setDnsNoticeMessage('');
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

  const showDnsNotice = useMemo(() => {
    if (maintenanceEnabled) return false;
    if (!dnsNoticeEnabled || !dnsNoticeUrl) return false;
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    if (!hostnameMatchesDnsSourceDomain(currentHost, dnsNoticeSourceDomain)) return false;
    return !pathIsAllowed(location.pathname);
  }, [maintenanceEnabled, dnsNoticeEnabled, dnsNoticeSourceDomain, dnsNoticeUrl, location.pathname]);

  if (loading) {
    return <PageLoader message="" />;
  }

  if (showMaintenance) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  if (showDnsNotice) {
    return <DnsNoticePage message={dnsNoticeMessage} targetUrl={dnsNoticeUrl} />;
  }

  return children;
};

export default MaintenanceGate;
