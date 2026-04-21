import React, { useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import PageLoader from '../../components/PageLoader';
import { FaPaperPlane, FaPhone, FaWhatsapp } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import { playUrgentAlertSound } from '../../utils/urgentAlertSound';
import { playIncomingCallSound } from '../../utils/incomingCallSound';
import './RestaurantMessages.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function waMeHref(phone) {
  const d = digitsOnly(phone);
  if (!d) return null;
  return `https://wa.me/${d}`;
}

function telHref(phone) {
  if (!phone) return null;
  const t = String(phone).trim();
  if (t.startsWith('tel:')) return t;
  if (t.startsWith('+')) return `tel:${t}`;
  const d = digitsOnly(t);
  if (!d) return null;
  return `tel:+${d}`;
}

function ContactIconButtons({ phone, labels }) {
  const wa = waMeHref(phone);
  const tel = telHref(phone);
  const waOff = `${labels.whatsapp} — ${labels.noPhone}`;
  const telOff = `${labels.call} — ${labels.noPhone}`;
  return (
    <div className="rm-contact-actions" role="group" aria-label={labels.group}>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="rm-contact-btn rm-contact-btn--wa"
          title={labels.whatsapp}
          aria-label={labels.whatsapp}
        >
          <FaWhatsapp size={20} />
        </a>
      ) : (
        <span className="rm-contact-btn rm-contact-btn--wa rm-contact-btn--disabled" title={waOff} aria-label={waOff}>
          <FaWhatsapp size={20} />
        </span>
      )}
      {tel ? (
        <a href={tel} className="rm-contact-btn rm-contact-btn--call" title={labels.call} aria-label={labels.call}>
          <FaPhone size={16} />
        </a>
      ) : (
        <span className="rm-contact-btn rm-contact-btn--call rm-contact-btn--disabled" title={telOff} aria-label={telOff}>
          <FaPhone size={16} />
        </span>
      )}
    </div>
  );
}

function useGroupedTimeline(messages, language) {
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const rows = [];
    let lastKey = null;
    for (const m of messages) {
      const d = new Date(m.createdAt);
      const key = fmt.format(d);
      if (key !== lastKey) {
        rows.push({ type: 'date', key: `d-${key}`, label: key });
        lastKey = key;
      }
      rows.push({
        type: 'msg',
        key: m._id,
        message: m,
        time: timeFmt.format(d),
      });
    }
    return rows;
  }, [messages, language]);
}

const RestaurantMessages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRid, setSelectedRid] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [inboxSearch, setInboxSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('details');
  const [noteDraft, setNoteDraft] = useState('');
  const pollRef = useRef(null);
  const urgentSoundKeyRef = useRef(null);
  const [pendingCalls, setPendingCalls] = useState([]);
  const incomingRingRef = useRef(null);

  const urgentList = useMemo(
    () => (conversations || []).filter((c) => c.urgentEscalationAt && !c.urgentSeenByRestaurantAt),
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
    setConversations([]);
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

  const filteredConversations = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const n = (c.client?.nom || '').toLowerCase();
      const e = (c.client?.email || '').toLowerCase();
      const p = (c.lastPreview || '').toLowerCase();
      return n.includes(q) || e.includes(q) || p.includes(q);
    });
  }, [conversations, inboxSearch]);

  useEffect(() => {
    if (!filteredConversations.length) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) => {
      if (prev && filteredConversations.some((c) => String(c._id) === String(prev))) return prev;
      return filteredConversations[0]._id;
    });
  }, [filteredConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId).catch(() => {});
    pollRef.current = setInterval(() => {
      loadMessages(activeId).catch(() => {});
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => String(c._id) === String(activeId)) || null,
    [conversations, activeId]
  );

  const clientPhone = activeConversation?.client?.telephone || '';
  const contactLabels = useMemo(
    () => ({
      group: `${t('chat', 'contactWhatsapp')} / ${t('chat', 'contactCall')}`,
      whatsapp: t('chat', 'contactWhatsappHint'),
      call: t('chat', 'contactCallHint'),
      noPhone: t('chat', 'noPhone'),
    }),
    [t]
  );

  useEffect(() => {
    if (!activeId) {
      setNoteDraft('');
      return;
    }
    const k = `rf-msg-notes-${activeId}`;
    try {
      setNoteDraft(sessionStorage.getItem(k) || '');
    } catch {
      setNoteDraft('');
    }
  }, [activeId]);

  const persistNote = (v) => {
    setNoteDraft(v);
    if (!activeId) return;
    try {
      sessionStorage.setItem(`rf-msg-notes-${activeId}`, v);
    } catch {
      /* ignore */
    }
  };

  const grouped = useGroupedTimeline(messages, language);

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
        urgentList.map((c) => axios.post(`${API_URL}/conversations/${c._id}/urgent/ack`, { side: 'restaurant' }))
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
    <div className="restaurant-messages-page rm-pro">
      <main className="restaurant-messages-main rm-main">
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

        <div className="rm-shell">
          <aside className="rm-list" aria-label={t('chat', 'chatsPanelTitle')}>
            <div className="rm-list-head">
              <h2 className="rm-list-title">{t('chat', 'chatsPanelTitle')}</h2>
              <input
                type="search"
                className="rm-list-search"
                placeholder={t('chat', 'inboxSearchPlaceholder')}
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                aria-label={t('chat', 'inboxSearchPlaceholder')}
              />
            </div>
            <div className="rm-list-scroll">
              {filteredConversations.length === 0 ? (
                <p className="restaurant-messages-empty">
                  {inboxSearch.trim() ? t('chat', 'inboxSearchNoMatch') : t('chat', 'noConversations')}
                </p>
              ) : (
                <ul>
                  {filteredConversations.map((c) => {
                    const photo = c.client?.photo;
                    const src = mediaUrl(photo);
                    const initial = (c.client?.nom || 'C').trim().charAt(0).toUpperCase();
                    return (
                      <li key={c._id}>
                        <button
                          type="button"
                          className={`rm-row ${activeId === c._id ? 'active' : ''} ${
                            c.urgentEscalationAt && !c.urgentSeenByRestaurantAt ? 'rm-row--urgent' : ''
                          }`}
                          onClick={() => setActiveId(c._id)}
                        >
                          {src ? (
                            <img src={src} alt="" className="rm-avatar" width={42} height={42} />
                          ) : (
                            <span className="rm-avatar" aria-hidden>
                              {initial}
                            </span>
                          )}
                          <div className="rm-row-body">
                            <div className="rm-row-top">
                              <span className="rm-row-name">{c.client?.nom || 'Client'}</span>
                              {c.unreadRestaurant > 0 ? <span className="rm-badge">{c.unreadRestaurant}</span> : null}
                            </div>
                            <div className="rm-row-preview">{c.lastPreview || t('chat', 'noPreview')}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section className="rm-thread" aria-label={t('chat', 'threadTitle')}>
            {!activeId ? (
              <p className="restaurant-messages-empty">
                {inboxSearch.trim() ? t('chat', 'inboxSearchNoMatch') : t('chat', 'noConversations')}
              </p>
            ) : (
              <>
                <div className="rm-thread-head">
                  <div className="rm-thread-identity">
                    <h2 className="rm-thread-name">{activeConversation?.client?.nom || 'Client'}</h2>
                    {activeConversation?.client?.email ? (
                      <p className="rm-thread-email">{activeConversation.client.email}</p>
                    ) : null}
                  </div>
                  <div className="rm-thread-actions">
                    <ContactIconButtons phone={clientPhone} labels={contactLabels} />
                    <button type="button" className="rm-report" onClick={reportClient}>
                      {t('chat', 'reportClient')}
                    </button>
                  </div>
                </div>
                <div className="rm-bubbles">
                  {grouped.map((row) => {
                    if (row.type === 'date') {
                      return (
                        <div key={row.key} className="rm-date-sep" role="separator">
                          {row.label}
                        </div>
                      );
                    }
                    const m = row.message;
                    const mine = m.senderRole === 'restaurant';
                    const assistant = m.senderRole === 'assistant';
                    return (
                      <div
                        key={row.key}
                        className={`rm-bubble ${mine ? 'rm-bubble--mine' : ''} ${assistant ? 'rm-bubble--assistant' : ''}`}
                      >
                        {m.imageUrl ? (
                          <img src={mediaUrl(m.imageUrl) || m.imageUrl} alt="" className="rm-bubble-img" />
                        ) : null}
                        {m.body ? <p style={{ margin: 0 }}>{m.body}</p> : null}
                        <div className="rm-bubble-meta">{row.time}</div>
                      </div>
                    );
                  })}
                </div>
                <form className="rm-form" onSubmit={send}>
                  <input
                    className="rm-form-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('chat', 'placeholder')}
                    disabled={sending}
                    aria-label={t('chat', 'placeholder')}
                  />
                  <button type="submit" className="rm-form-send" disabled={sending} aria-label={t('chat', 'send')}>
                    <FaPaperPlane />
                  </button>
                </form>
              </>
            )}
          </section>

          <aside className="rm-inspector" aria-label={t('chat', 'customerDetailsTab')}>
            {!activeId ? (
              <div className="rm-inspector-body">
                <p className="restaurant-messages-empty">{t('chat', 'open')}</p>
              </div>
            ) : (
              <>
                <div className="rm-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inspectorTab === 'details'}
                    className={`rm-tab${inspectorTab === 'details' ? ' rm-tab--active' : ''}`}
                    onClick={() => setInspectorTab('details')}
                  >
                    {t('chat', 'customerDetailsTab')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={inspectorTab === 'notes'}
                    className={`rm-tab${inspectorTab === 'notes' ? ' rm-tab--active' : ''}`}
                    onClick={() => setInspectorTab('notes')}
                  >
                    {t('chat', 'notesTab')}
                  </button>
                </div>
                <div className="rm-inspector-body">
                  {inspectorTab === 'details' ? (
                    <>
                      <div className="rm-field">
                        <span className="rm-field-label">Email</span>
                        <div className="rm-field-value">{activeConversation?.client?.email || '—'}</div>
                      </div>
                      <div className="rm-field">
                        <span className="rm-field-label">{t('chat', 'contactCall')}</span>
                        <div className="rm-field-row">
                          <div className="rm-field-value">{clientPhone ? clientPhone : t('chat', 'noPhone')}</div>
                          <ContactIconButtons phone={clientPhone} labels={contactLabels} />
                        </div>
                      </div>
                      {activeConversation?.client?.banned ? <span className="rm-banned">{t('chat', 'banned')}</span> : null}
                    </>
                  ) : (
                    <textarea
                      className="rm-notes"
                      value={noteDraft}
                      onChange={(e) => persistNote(e.target.value)}
                      placeholder={t('chat', 'notesPlaceholder')}
                      aria-label={t('chat', 'notesPlaceholder')}
                    />
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default RestaurantMessages;
