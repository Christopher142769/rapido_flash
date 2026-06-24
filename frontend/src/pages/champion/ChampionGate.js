import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import PageLoader from '../../components/PageLoader';
import { fetchMyChampionProfile } from '../../utils/championApi';

export default function ChampionGate() {
  const { user, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [champion, setChampion] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadChampion = useCallback(async () => {
    const data = await fetchMyChampionProfile();
    setChampion(data);
    return data;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'livreur') {
      setLoading(false);
      return;
    }
    reloadChampion()
      .catch(() => setChampion(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.role, reloadChampion]);

  if (authLoading || loading) return <PageLoader />;

  if (!isAuthenticated || user?.role !== 'livreur') {
    return <Navigate to="/login?next=/champion/app" replace />;
  }

  if (!champion) {
    return <Navigate to="/champion" replace />;
  }

  if (champion.accountStatus === 'pending_validation') {
    return <Navigate to="/champion/en-attente" replace />;
  }
  if (champion.accountStatus === 'rejected') {
    return <Navigate to="/champion/rejete" replace />;
  }
  if (champion.accountStatus === 'suspended') {
    return <Navigate to="/champion/suspendu" replace />;
  }
  if (champion.accountStatus !== 'active') {
    return <Navigate to="/champion/en-attente" replace />;
  }

  return <Outlet context={{ champion, reloadChampion }} />;
}
