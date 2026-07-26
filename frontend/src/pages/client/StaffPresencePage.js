import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import PageLoader from '../../components/PageLoader';
import './StaffPresencePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function StaffPresencePage() {
  const { code } = useParams();
  const encodedCode = useMemo(() => String(code || '').trim(), [code]);

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setValid(false);
    setResult(null);

    (async () => {
      try {
        if (!encodedCode) throw new Error('Code manquant');
        await axios.get(`${API_URL}/staff-presence/public/${encodeURIComponent(encodedCode)}`);
        if (!cancelled) setValid(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'QR invalide');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [encodedCode]);

  const formatCheckedAt = (d) => {
    try {
      if (!d) return '';
      return new Date(d).toLocaleString('fr-FR', {
        timeZone: 'Africa/Porto-Novo',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(
        `${API_URL}/staff-presence/public/${encodeURIComponent(encodedCode)}/check`,
        { firstName, lastName }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible d’enregistrer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="staff-presence-page">
        <PageLoader message="Chargement…" />
      </div>
    );
  }

  return (
    <div className="staff-presence-page">
      <div className="staff-presence-card">
        <img src="/images/logo.png" alt="" className="staff-presence-logo" width={56} height={56} />
        <h1>Présence personnel</h1>
        <p className="staff-presence-lead">
          Indiquez votre nom et prénom, puis confirmez votre présence. L’heure est enregistrée
          automatiquement.
        </p>

        {error && !result ? <p className="staff-presence-error">{error}</p> : null}

        {!valid && !result ? (
          <p className="staff-presence-error">Ce QR code n’est pas valide.</p>
        ) : null}

        {result ? (
          <div className="staff-presence-success" role="status">
            <strong>
              {result.alreadyPresent ? 'Déjà présent aujourd’hui' : 'Présence enregistrée'}
            </strong>
            <p>
              {result.firstName} {result.lastName}
            </p>
            <p className="staff-presence-time">
              Pointé à {formatCheckedAt(result.checkedAt)}
            </p>
          </div>
        ) : null}

        {valid && !result ? (
          <form className="staff-presence-form" onSubmit={handleSubmit}>
            <label>
              Prénom
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                minLength={2}
                placeholder="Votre prénom"
              />
            </label>
            <label>
              Nom
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                required
                minLength={2}
                placeholder="Votre nom"
              />
            </label>
            <button type="submit" className="staff-presence-cta" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Je suis présent'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
