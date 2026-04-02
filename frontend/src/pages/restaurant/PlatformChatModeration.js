import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import { pickLocalized } from '../../utils/i18nContent';
import './PlatformChatModeration.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PlatformChatModeration = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.canManageMaintenance) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    axios
      .get(`${API_URL}/conversations/admin/all`)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

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
        <h1>{t('chat', 'moderationTitle')}</h1>
        <p className="platform-chat-mod-hint">
          Analyse des conversations — signalements visibles côté structure et ici.
        </p>
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
                <tr key={c._id}>
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
