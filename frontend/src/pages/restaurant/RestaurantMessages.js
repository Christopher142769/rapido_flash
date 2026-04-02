import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import { FaPaperPlane } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import './RestaurantMessages.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantMessages = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRid, setSelectedRid] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pollRef = useRef(null);

  const loadMessages = async (cid) => {
    const res = await axios.get(`${API_URL}/conversations/${cid}/messages?limit=80`);
    setMessages(res.data || []);
    await axios.post(`${API_URL}/conversations/${cid}/read`, { side: 'restaurant' });
  };

  useEffect(() => {
    if (user?.role === 'client') {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/restaurants/my/restaurants`);
        setRestaurants(res.data || []);
        if (res.data?.length) {
          setSelectedRid(res.data[0]._id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRid) return;
    axios
      .get(`${API_URL}/conversations/restaurant/${selectedRid}`)
      .then((res) => {
        setConversations(res.data || []);
        setActiveId(null);
        setMessages([]);
      })
      .catch(() => setConversations([]));
  }, [selectedRid]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch(() => {});
    pollRef.current = setInterval(() => {
      loadMessages(activeId).catch(() => {});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  const send = async (e) => {
    e.preventDefault();
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('body', text.trim());
      const res = await axios.post(`${API_URL}/conversations/${activeId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const reportClient = async () => {
    if (!activeId) return;
    const reason = window.prompt(t('chat', 'reason'));
    if (reason == null) return;
    try {
      await axios.post(`${API_URL}/conversations/${activeId}/report`, { target: 'client', reason });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <PageLoader message={t('chat', 'loading')} />;

  return (
    <div className="restaurant-messages-page">
      <DashboardSidebar onLogout={logout} />
      <main className="restaurant-messages-main">
        <header className="restaurant-messages-header">
          <h1>{t('chat', 'dashboardTitle')}</h1>
          {user?.canManageMaintenance ? (
            <button type="button" className="restaurant-messages-admin-link" onClick={() => navigate('/dashboard/messages-moderation')}>
              {t('chat', 'moderationTitle')}
            </button>
          ) : null}
        </header>

        {restaurants.length > 1 ? (
          <select
            className="restaurant-messages-select"
            value={selectedRid || ''}
            onChange={(e) => setSelectedRid(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>
                {pickLocalized(language, r, 'nom')}
              </option>
            ))}
          </select>
        ) : null}

        <div className="restaurant-messages-split">
          <aside className="restaurant-messages-list">
            {conversations.length === 0 ? (
              <p className="restaurant-messages-empty">{t('chat', 'noConversations')}</p>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      className={`restaurant-messages-row ${activeId === c._id ? 'active' : ''}`}
                      onClick={() => setActiveId(c._id)}
                    >
                      <span className="restaurant-messages-client">{c.client?.nom || 'Client'}</span>
                      {c.unreadRestaurant > 0 ? <span className="restaurant-messages-badge">{c.unreadRestaurant}</span> : null}
                      <span className="restaurant-messages-preview">{c.lastPreview}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          <section className="restaurant-messages-thread">
            {!activeId ? (
              <p className="restaurant-messages-empty">{t('chat', 'open')}</p>
            ) : (
              <>
                <div className="restaurant-messages-toolbar">
                  <button type="button" className="restaurant-messages-report" onClick={reportClient}>
                    {t('chat', 'reportClient')}
                  </button>
                </div>
                <div className="restaurant-messages-bubbles">
                  {messages.map((m) => {
                    const mine = m.senderRole === 'restaurant';
                    return (
                      <div key={m._id} className={`rm-bubble ${mine ? 'rm-bubble--mine' : ''}`}>
                        {m.imageUrl ? <img src={m.imageUrl} alt="" className="rm-bubble-img" /> : null}
                        {m.body ? <p>{m.body}</p> : null}
                      </div>
                    );
                  })}
                </div>
                <form className="restaurant-messages-form" onSubmit={send}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('chat', 'placeholder')}
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending}>
                    <FaPaperPlane />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default RestaurantMessages;
