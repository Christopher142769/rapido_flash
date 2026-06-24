import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import PageLoader from '../../components/PageLoader';
import { fetchMyChampionProfile } from '../../utils/championApi';
import './champion.css';

const CONFIG = {
  pending_validation: {
    icon: '⏳',
    title: 'Ton dossier est en cours d’examen',
    body: 'Notre équipe vérifie tes documents. Tu recevras un email dès que ton compte sera activé.',
    path: '/champion/en-attente',
  },
  rejected: {
    icon: '❌',
    title: 'Candidature refusée',
    body: '',
    path: '/champion/rejete',
  },
  suspended: {
    icon: '⛔',
    title: 'Compte suspendu',
    body: '',
    path: '/champion/suspendu',
  },
};

export default function ChampionStatusPage({ statusKey }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [champion, setChampion] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyChampionProfile();
      setChampion(data);
    } catch (_) {
      setChampion(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'livreur') load();
    else setLoading(false);
  }, [isAuthenticated, user?.role, load]);

  if (!isAuthenticated || user?.role !== 'livreur') {
    return <Navigate to="/login?next=/champion/app" replace />;
  }

  if (loading) return <PageLoader />;

  if (champion?.accountStatus === 'active') {
    return <Navigate to="/champion/app" replace />;
  }

  const cfg = CONFIG[statusKey] || CONFIG.pending_validation;
  const reason =
    statusKey === 'rejected'
      ? champion?.rejectionReason
      : statusKey === 'suspended'
        ? champion?.suspensionReason
        : '';

  return (
    <div className="champion-shell champion-shell--centered champion-status-page">
      <div className="champion-status-icon">{cfg.icon}</div>
      <h2>{cfg.title}</h2>
      <p style={{ color: '#666', maxWidth: 360, margin: '0 auto 16px' }}>{cfg.body}</p>
      {reason ? (
        <div className="champion-card" style={{ textAlign: 'left' }}>
          <strong>Motif :</strong>
          <p style={{ margin: '8px 0 0' }}>{reason}</p>
        </div>
      ) : null}
      <div className="champion-bottom-actions" style={{ marginTop: 24 }}>
        <Link to="/champion" className="champion-btn champion-btn--secondary">
          Retour à l’accueil Champion
        </Link>
      </div>
    </div>
  );
}
