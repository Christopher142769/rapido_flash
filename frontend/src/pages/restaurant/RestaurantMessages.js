import React, { useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import PageLoader from '../../components/PageLoader';
import { FaPaperPlane } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import { playUrgentAlertSound } from '../../utils/urgentAlertSound';
import { playIncomingCallSound } from '../../utils/incomingCallSound';
import './RestaurantMessages.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantMessages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
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
  const urgentSoundKeyRef = useRef(null);
  const [pendingCalls, setPendingCalls] = useState([]);
  const incomingRingRef = useRef(null);

  const urgentList = useMemo(
    () =>
      (conversations || []).filter(
        (c) => c.urgentEscalationAt && !c.urgentSeenByRestaurantAt
      ),
    [conversations]
  );

  useEffect(() => {
    if (!urgentList.length) {
      urgentSoundKeyRef.current = null;
      return;
    }
    const key = urgentList.map((c) => c._id).join(',');
    if (urgentSoundKeyRef.current !== key) {
      urgentSoundKeyRef.current = key;
      playUrgentAlertSound();
    }
  }, [urgentList]);

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

  const loadConversations = useCallback(() => {
    if (!selectedRid) return;
    axios
      .get(`${API_URL}/conversations/restaurant/${selectedRid}`)
      .then((res) => setConversations(res.data || []))
      .catch(() => setConversations([]));
  }, [selectedRid]);

  useEffect(() => {
    if (!selectedRid) return;
    setActiveId(null);
    setMessages([]);
    loadConversations();
    const id = setInterval(loadConversations, 12000);
    return () => clearInterval(id);
  }, [selectedRid, loadConversations]);

  useEffect(() => {
    if (!selectedRid) return undefined;
    const poll = () => {
      axios
        .get(`${API_URL}/conversations/restaurant/${selectedRid}/calls/pending`)
        .then((r) => setPendingCalls(r.data || []))
        .catch(() => setPendingCalls([]));
    };
    poll();
    const id = setInterval(poll, 3200);
    return () => clearInterval(id);
  }, [selectedRid]);

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
      setActiveId(convId);
      await loadMessages(convId);
      loadConversations();
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

  const ackUrgent = async () => {
    try {
      await Promise.all(
        urgentList.map((c) =>
          axios.post(`${API_URL}/conversations/${c._id}/urgent/ack`, { side: 'restaurant' })
        )
      );
      loadConversations();
    } catch (e) {
      console.error(e);
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
      <main className="restaurant-messages-main">
        {topIncoming ? (
          <div className="incoming-call-overlay" role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
            <div className="incoming-call-card">
              <h2 id="incoming-call-title" className="incoming-call-title">
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
        <header className="restaurant-messages-header">
          <h1>{t('chat', 'dashboardTitle')}</h1>
          {user?.canManageMaintenance ? (
            <button type="button" className="restaurant-messages-admin-link" onClick={() => navigate('/dashboard/messages-moderation')}>
              {t('chat', 'moderationTitle')}
            </button>
          ) : null}
        </header>

        {urgentList.length > 0 ? (
          <div className="restaurant-messages-urgent-banner" role="alert">
            <div className="restaurant-messages-urgent-text">
              <strong>{t('chat', 'urgentAlertTitle')}</strong>
              <p>{t('chat', 'urgentAlertBody')}</p>
            </div>
            <button type="button" className="restaurant-messages-urgent-btn" onClick={ackUrgent}>
              {t('chat', 'urgentAck')}
            </button>
          </div>
        ) : null}

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
                      className={`restaurant-messages-row ${activeId === c._id ? 'active' : ''} ${
                        c.urgentEscalationAt && !c.urgentSeenByRestaurantAt ? 'restaurant-messages-row--urgent' : ''
                      }`}
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
                    const assistant = m.senderRole === 'assistant';
                    return (
                      <div
                        key={m._id}
                        className={`rm-bubble ${mine ? 'rm-bubble--mine' : ''} ${assistant ? 'rm-bubble--assistant' : ''}`}
                      >
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
