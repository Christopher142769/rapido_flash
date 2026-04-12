import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import { pickLocalized } from '../../utils/i18nContent';
import { playUrgentAlertSound } from '../../utils/urgentAlertSound';
import { playIncomingCallSound } from '../../utils/incomingCallSound';
import './PlatformChatModeration.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PlatformChatModeration = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const urgentSoundKeyRef = useRef(null);
  const [pendingCalls, setPendingCalls] = useState([]);
  const incomingRingRef = useRef(null);

  const urgentPlatform = useMemo(
    () =>
      (rows || []).filter((c) => c.urgentEscalationAt && !c.urgentSeenByPlatformAt),
    [rows]
  );

  useEffect(() => {
    if (!user?.canManageMaintenance) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loadRows = useCallback(() => {
    return axios
      .get(`${API_URL}/conversations/admin/all`)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRows().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const id = setInterval(() => loadRows(), 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [loadRows]);

  useEffect(() => {
    if (!user?.canManageMaintenance) return undefined;
    const poll = () => {
      axios
        .get(`${API_URL}/conversations/admin/calls/pending`)
        .then((r) => setPendingCalls(r.data || []))
        .catch(() => setPendingCalls([]));
    };
    poll();
    const id = setInterval(poll, 3400);
    return () => clearInterval(id);
  }, [user?.canManageMaintenance]);

  const topIncoming = pendingCalls[0];

  useEffect(() => {
    if (!topIncoming?._id) {
      incomingRingRef.current = null;
      return;
    }
    if (incomingRingRef.current !== topIncoming._id) {
      incomingRingRef.current = topIncoming._id;
      playIncomingCallSound();
    }
  }, [topIncoming?._id]);

  const acceptIncomingCall = async () => {
    if (!topIncoming?.conversation?._id) return;
    const convId = topIncoming.conversation._id;
    try {
      await axios.post(`${API_URL}/conversations/${convId}/calls/${topIncoming._id}/accept`);
      setPendingCalls([]);
      await loadRows();
    } catch (e) {
      console.error(e);
    }
  };

  const rejectIncomingCall = async () => {
    if (!topIncoming?.conversation?._id) return;
    const convId = topIncoming.conversation._id;
    try {
      await axios.post(`${API_URL}/conversations/${convId}/calls/${topIncoming._id}/reject`);
      setPendingCalls((prev) => prev.filter((c) => c._id !== topIncoming._id));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!urgentPlatform.length) {
      urgentSoundKeyRef.current = null;
      return;
    }
    const key = urgentPlatform.map((c) => c._id).join(',');
    if (urgentSoundKeyRef.current !== key) {
      urgentSoundKeyRef.current = key;
      playUrgentAlertSound();
    }
  }, [urgentPlatform]);

  const ackUrgentPlatform = async () => {
    try {
      await Promise.all(
        urgentPlatform.map((c) =>
          axios.post(`${API_URL}/conversations/${c._id}/urgent/ack`, { side: 'platform' })
        )
      );
      await loadRows();
    } catch (e) {
      console.error(e);
    }
  };

  const banUser = async (userId, banned) => {
    const reason = banned ? window.prompt(t('chat', 'reason')) : '';
    if (banned && reason == null) return;
    try {
      await axios.patch(`${API_URL}/users/${userId}/ban`, { banned, reason: reason || '' });
      setRows((prev) =>
        prev.map((c) => {
          if (String(c.client?._id || c.client) !== String(userId)) return c;
          return { ...c, client: { ...c.client, banned } };
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <PageLoader message={t('chat', 'loading')} />;

  return (
    <div className="platform-chat-mod-page">
      <DashboardSidebar onLogout={logout} />
      <main className="platform-chat-mod-main">
        {topIncoming ? (
          <div className="incoming-call-overlay" role="dialog" aria-modal="true" aria-labelledby="platform-incoming-call-title">
            <div className="incoming-call-card">
              <h2 id="platform-incoming-call-title" className="incoming-call-title">
                {t('chat', 'incomingCallTitle')}
              </h2>
              <p className="incoming-call-body">{t('chat', 'incomingCallBody')}</p>
              <p className="incoming-call-client">{topIncoming.initiatedBy?.nom || 'Client'}</p>
              <div className="incoming-call-actions">
                <button type="button" className="incoming-call-btn incoming-call-btn--accept" onClick={acceptIncomingCall}>
                  {t('chat', 'incomingCallAccept')}
                </button>
                <button type="button" className="incoming-call-btn incoming-call-btn--reject" onClick={rejectIncomingCall}>
                  {t('chat', 'incomingCallReject')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <h1>{t('chat', 'moderationTitle')}</h1>
        <p className="platform-chat-mod-hint">
          Analyse des conversations — signalements visibles côté structure et ici.
        </p>

        {urgentPlatform.length > 0 ? (
          <div className="platform-chat-mod-urgent" role="alert">
            <div>
              <strong>{t('chat', 'urgentAlertTitle')}</strong>
              <p>{t('chat', 'urgentAlertBody')}</p>
            </div>
            <button type="button" className="platform-chat-mod-urgent-btn" onClick={ackUrgentPlatform}>
              {t('chat', 'urgentAck')}
            </button>
          </div>
        ) : null}

        <div className="platform-chat-mod-table-wrap">
          <table className="platform-chat-mod-table">
            <thead>
              <tr>
                <th>Structure</th>
                <th>Client</th>
                <th>Dernier message</th>
                <th>Signalements</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c._id}
                  className={
                    c.urgentEscalationAt && !c.urgentSeenByPlatformAt ? 'platform-chat-mod-row--urgent' : ''
                  }
                >
                  <td>{c.restaurant ? pickLocalized(language, c.restaurant, 'nom') : '—'}</td>
                  <td>
                    {c.client?.nom || '—'}
                    {c.client?.banned ? <span className="platform-chat-mod-banned">{t('chat', 'banned')}</span> : null}
                  </td>
                  <td className="platform-chat-mod-preview">{c.lastPreview}</td>
                  <td>{(c.reports || []).length}</td>
                  <td>
                    {c.client?._id ? (
                      <button
                        type="button"
                        className="platform-chat-mod-ban"
                        onClick={() => banUser(c.client._id, !c.client.banned)}
                      >
                        {c.client.banned ? t('chat', 'unban') : t('chat', 'ban')}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default PlatformChatModeration;
