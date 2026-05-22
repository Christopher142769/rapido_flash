import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './PushNotificationsDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function PushNotificationsDashboard() {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/home');

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get(`${API_URL}/push/broadcast/stats`, authHeaders);
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setSending(true);
    try {
      const res = await axios.post(
        `${API_URL}/push/broadcast`,
        {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/home',
          tag: 'rapido-info',
        },
        authHeaders
      );
      setFeedback({ type: 'success', text: res.data?.message || 'Notification envoyée.' });
      setTitle('');
      setBody('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Échec de l’envoi';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim() && body.trim() && !sending && (stats?.clientsWithPush || 0) > 0;
  const channels = stats?.pushChannels;

  return (
    <div className="dashboard-page push-notif-page">
      <header>
        <h1 className="text-xl font-bold text-[var(--rf-text-dark)]">Notifications push</h1>
        <p className="mt-1 text-sm text-[var(--rf-text-muted)]">
          Envoyez une info à tous les utilisateurs de l’app qui ont activé les notifications sur leur téléphone.
        </p>
      </header>

      <section className="push-notif-card" aria-busy={loadingStats}>
        <h2 className="text-base font-bold mb-3">Audience</h2>
        {loadingStats ? (
          <p className="text-sm text-[var(--rf-text-muted)]">Chargement…</p>
        ) : stats ? (
          <>
            <div className="push-notif-stats">
              <div className="push-notif-stat">
                <strong>{stats.clientsWithPush}</strong>
                <span>recevront la notif</span>
              </div>
              <div className="push-notif-stat">
                <strong>{stats.totalClients}</strong>
                <span>comptes clients</span>
              </div>
              <div className="push-notif-stat">
                <strong>{stats.mobileTokenCount}</strong>
                <span>appareils mobile</span>
              </div>
            </div>
            {channels ? (
              <div className="push-notif-channels mt-3">
                <span
                  className={`push-notif-badge ${channels.fcm ? 'ok' : 'off'}`}
                  title="Firebase Cloud Messaging (app Android/iOS)"
                >
                  FCM {channels.fcm ? 'actif' : 'non configuré'}
                </span>
                <span
                  className={`push-notif-badge ${channels.webVapid ? 'ok' : 'off'}`}
                  title="Notifications navigateur"
                >
                  Web {channels.webVapid ? 'actif' : 'non configuré'}
                </span>
              </div>
            ) : null}
            {stats.clientsWithPush === 0 ? (
              <p className="push-notif-alert warn mt-3">
                Aucun utilisateur n’a encore enregistré de jeton push. Les clients doivent ouvrir l’app et accepter les
                notifications.
              </p>
            ) : null}
          </>
        ) : (
          <p className="push-notif-alert error">Impossible de charger les statistiques.</p>
        )}
      </section>

      <section className="push-notif-card">
        <h2 className="text-base font-bold mb-3">Nouvelle notification</h2>
        <form className="push-notif-form" onSubmit={sendBroadcast}>
          <div>
            <label className="push-notif-label" htmlFor="push-title">
              Titre
            </label>
            <input
              id="push-title"
              className="push-notif-input"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              maxLength={80}
              placeholder="Ex. Nouvelle offre Shop"
              required
            />
            <p className="push-notif-hint">{title.length}/80 caractères</p>
          </div>

          <div>
            <label className="push-notif-label" htmlFor="push-body">
              Message
            </label>
            <textarea
              id="push-body"
              className="push-notif-textarea"
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
              maxLength={300}
              placeholder="Texte affiché sur l’écran de verrouillage et dans le centre de notifications"
              required
            />
            <p className="push-notif-hint">{body.length}/300 caractères</p>
          </div>

          <div>
            <label className="push-notif-label" htmlFor="push-url">
              Lien au clic (optionnel)
            </label>
            <input
              id="push-url"
              className="push-notif-input"
              value={url}
              onChange={(ev) => setUrl(ev.target.value)}
              placeholder="/home"
            />
            <p className="push-notif-hint">Chemin dans l’app, ex. /home ou /shop/mon-produit</p>
          </div>

          {feedback ? (
            <p className={`push-notif-alert ${feedback.type}`} role="status">
              {feedback.text}
            </p>
          ) : null}

          <button type="submit" className="push-notif-button" disabled={!canSend}>
            {sending ? 'Envoi en cours…' : 'Envoyer à tous les utilisateurs'}
          </button>
        </form>
      </section>
    </div>
  );
}
