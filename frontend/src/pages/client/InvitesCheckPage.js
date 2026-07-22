import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';

import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import PageLoader from '../../components/PageLoader';

import './InvitesCheckPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function InvitesCheckPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);

  const encodedCode = useMemo(() => String(code || '').trim(), [code]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setInvitation(null);

    const run = async () => {
      try {
        if (!encodedCode) throw new Error('Code manquant');
        const res = await axios.get(`${API_URL}/invitations/public/${encodedCode}`);
        if (!cancelled) setInvitation(res.data);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Erreur';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [encodedCode]);

  const prettyDate = (d) => {
    try {
      if (!d) return '';
      return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return '';
    }
  };

  const handleCheckPresence = async () => {
    if (!encodedCode || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/invitations/public/${encodedCode}/check`);
      // Idempotent côté serveur : déjà présent -> OK aussi
      if (invitation) {
        setInvitation((prev) => ({
          ...prev,
          present: true,
          checkedAt: res.data?.checkedAt || prev.checkedAt,
        }));
      } else {
        setInvitation({
          ...res.data,
          present: true,
          fullName: res.data?.fullName,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="invites-check-page">
        <TopNavbar />
        <PageLoader message="Chargement…" />
        <BottomNavbar />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="invites-check-page">
        <TopNavbar />
        <div className="invites-check-card invites-check-card--err">
          <h1 className="invites-check-title">Invité introuvable</h1>
          <p className="invites-check-text">{error || 'Erreur'}</p>
          <div className="invites-check-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/home')}>
              Retour à l’accueil
            </button>
          </div>
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="invites-check-page">
      <TopNavbar />

      <div className="invites-check-card">
        <h1 className="invites-check-title">Présence des invités</h1>

        <div className="invites-check-invite">
          <div className="invites-check-invite-name">{invitation.fullName}</div>
          <div className="invites-check-invite-status">
            {invitation.present ? (
              <span className="invites-check-badge invites-check-badge--ok">Présent</span>
            ) : (
              <span className="invites-check-badge invites-check-badge--todo">À confirmer</span>
            )}
          </div>
          {invitation.present ? (
            <div className="invites-check-checked-at">
              Vérifié le : <strong>{prettyDate(invitation.checkedAt) || '—'}</strong>
            </div>
          ) : null}
        </div>

        {!invitation.present ? (
          <div className="invites-check-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheckPresence}
              disabled={submitting}
            >
              {submitting ? '…' : 'Cocher la présence'}
            </button>
            <Link to="/home" className="invites-check-secondary-link">
              Retour
            </Link>
          </div>
        ) : (
          <div className="invites-check-actions">
            <Link to="/home" className="btn btn-primary invites-check-secondary-btn">
              Terminer
            </Link>
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
}

