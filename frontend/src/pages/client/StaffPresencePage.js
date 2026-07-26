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
  const [kind, setKind] = useState('arrival');
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isExit = kind === 'exit';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setValid(false);
    setResult(null);
    setKind('arrival');

    (async () => {
      try {
        if (!encodedCode) throw new Error('Code manquant');
        const res = await axios.get(
          `${API_URL}/staff-presence/public/${encodeURIComponent(encodedCode)}`
        );
        if (!cancelled) {
          setValid(true);
          setKind(res.data?.kind === 'exit' ? 'exit' : 'arrival');
        }
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
      if (res.data?.kind === 'exit' || res.data?.kind === 'arrival') {
        setKind(res.data.kind);
      }
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

  const title = isExit ? 'Sortie' : 'Arrivée';
  const tag = isExit ? 'Fin de service' : 'Début de service';
  const lead = isExit
    ? 'Saisissez votre prénom et votre nom, puis confirmez votre départ. L’heure de sortie est enregistrée automatiquement.'
    : 'Saisissez votre prénom et votre nom, puis confirmez votre arrivée. L’heure est enregistrée automatiquement.';
  const cta = isExit ? 'Je suis parti' : 'Je suis présent';
  const successNew = isExit ? 'Sortie enregistrée' : 'Arrivée enregistrée';
  const successAlready = isExit
    ? 'Sortie déjà enregistrée aujourd’hui'
    : 'Arrivée déjà enregistrée aujourd’hui';

  return (
    <div className={`staff-presence-page${isExit ? ' staff-presence-page--exit' : ''}`}>
      <div className="staff-presence-shell">
        <header className="staff-presence-brand">
          <div className="staff-presence-logo-wrap">
            <img
              src="/images/logo.png"
              alt="Rapido Flash"
              className="staff-presence-logo"
              width={78}
              height={78}
            />
          </div>
          <p className="staff-presence-brand-name">Rapido Flash</p>
          <p className="staff-presence-brand-tag">{tag}</p>
        </header>

        <div className="staff-presence-panel">
          <h1>{title}</h1>
          <p className="staff-presence-lead">{lead}</p>

          {error && !result ? <p className="staff-presence-error">{error}</p> : null}

          {!valid && !result ? (
            <p className="staff-presence-error">Ce QR code n’est pas valide.</p>
          ) : null}

          {result ? (
            <div className="staff-presence-success" role="status">
              <div className="staff-presence-success-icon" aria-hidden>
                ✓
              </div>
              <strong>{result.alreadyPresent ? successAlready : successNew}</strong>
              <p>
                {result.firstName} {result.lastName}
              </p>
              <p className="staff-presence-time">
                {isExit ? 'Parti à' : 'Arrivé à'} {formatCheckedAt(result.checkedAt)}
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
                {submitting ? 'Enregistrement…' : cta}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
