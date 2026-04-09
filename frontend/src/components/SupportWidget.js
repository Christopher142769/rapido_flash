import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoClose } from 'react-icons/io5';
import {
  MdHome,
  MdChatBubbleOutline,
  MdHelpOutline,
  MdAssignmentTurnedIn,
  MdSearch,
  MdChevronRight,
  MdCheckCircle,
} from 'react-icons/md';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { useSupportWidget } from '../context/SupportWidgetContext';
import ChatThreadPanel from './ChatThreadPanel';
import { pickLocalized } from '../utils/i18nContent';
import './SupportWidget.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MEDIA_BASE = process.env.REACT_APP_BASE_URL || API_URL.replace(/\/api\/?$/, '');

function firstName(nom) {
  if (!nom || typeof nom !== 'string') return '';
  return nom.trim().split(/\s+/)[0] || '';
}

const SupportWidget = () => {
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const { open, setOpen, launch } = useSupportWidget();
  const navigate = useNavigate();

  const [view, setView] = useState('home');
  const [threadRid, setThreadRid] = useState(null);
  const [threadPid, setThreadPid] = useState(null);
  const [navTab, setNavTab] = useState('home');
  const [search, setSearch] = useState('');
  const [structures, setStructures] = useState([]);
  const [platformId, setPlatformId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [convSearch, setConvSearch] = useState('');

  const displayName = firstName(user?.nom) || (language === 'en' ? 'there' : 'vous');

  useEffect(() => {
    if (!open) return;
    if (launch.restaurantId) {
      setView('thread');
      setThreadRid(launch.restaurantId);
      setThreadPid(launch.productId || null);
      setNavTab('messages');
    } else if (launch.view === 'messages') {
      setView('messages');
      setNavTab('messages');
    } else {
      setView('home');
      setNavTab('home');
    }
  }, [open, launch]);

  useEffect(() => {
    if (!open || user?.role !== 'client') return;
    setPlatformLoading(true);
    axios
      .get(`${API_URL}/conversations/platform-support-restaurant`)
      .then((r) => setPlatformId(r.data?.restaurantId || null))
      .catch(() => setPlatformId(null))
      .finally(() => setPlatformLoading(false));
    axios
      .get(`${API_URL}/conversations/client`)
      .then((r) => setConversations(r.data || []))
      .catch(() => setConversations([]));
    const loc = JSON.parse(localStorage.getItem('userLocation') || '{}');
    const params = {};
    if (loc.latitude != null && loc.longitude != null) {
      params.latitude = loc.latitude;
      params.longitude = loc.longitude;
    }
    axios
      .get(`${API_URL}/restaurants`, { params })
      .then((r) => setStructures(r.data || []))
      .catch(() => setStructures([]));
  }, [open, user]);

  const unreadMessages = useMemo(
    () => conversations.reduce((n, c) => n + (c.unreadClient > 0 ? 1 : 0), 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = pickLocalized(language, c.restaurant, 'nom') || '';
      const prev = (c.lastPreview || '').toLowerCase();
      return name.toLowerCase().includes(q) || prev.includes(q);
    });
  }, [conversations, convSearch, language]);

  const openRapidoThread = useCallback(() => {
    if (!platformId) return;
    setThreadRid(platformId);
    setThreadPid(null);
    setView('thread');
    setNavTab('messages');
  }, [platformId]);

  const shortcuts = useMemo(
    () => [
      { key: 'structure', label: t('supportWidget', 'shortcutWriteStructure'), action: () => { setView('structures'); setNavTab('home'); } },
      { key: 'rapido', label: t('supportWidget', 'shortcutWriteRapido'), action: openRapidoThread },
      { key: 'orders', label: t('supportWidget', 'shortcutOrders'), action: () => { setOpen(false); navigate('/orders'); } },
      { key: 'help', label: t('supportWidget', 'shortcutHelp'), action: () => { setView('help'); setNavTab('help'); } },
    ],
    [t, navigate, setOpen, openRapidoThread]
  );

  const filteredShortcuts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shortcuts;
    return shortcuts.filter((s) => s.label.toLowerCase().includes(q));
  }, [shortcuts, search]);

  function openStructureThread(id) {
    setThreadRid(id);
    setThreadPid(null);
    setView('thread');
    setNavTab('messages');
  }

  function goMessagesList() {
    setView('messages');
    setNavTab('messages');
    axios.get(`${API_URL}/conversations/client`).then((r) => setConversations(r.data || []));
  }

  if (!user || user.role !== 'client') return null;

  return (
    <>
      {open ? (
        <div className="support-widget-overlay" role="dialog" aria-modal="true" aria-label={t('supportWidget', 'fabOpen')}>
          <div className={`support-widget-shell ${view === 'thread' ? 'support-widget-shell--thread' : ''}`}>
            <div className="support-widget-content">
            {view === 'thread' && threadRid ? (
              <ChatThreadPanel
                restaurantId={threadRid}
                productId={threadPid}
                compact
                onBack={() => {
                  setView('messages');
                  setNavTab('messages');
                  goMessagesList();
                }}
                onCloseWidget={() => setOpen(false)}
              />
            ) : null}

            {view === 'messages' ? (
              <div className="support-widget-messages">
                <header className="support-widget-messages-head support-widget-messages-head--wave">
                  <div className="support-widget-messages-head-row">
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => { setView('home'); setNavTab('home'); setConvSearch(''); }} aria-label={t('supportWidget', 'back')}>
                      <MdChevronRight style={{ transform: 'rotate(180deg)' }} size={22} />
                    </button>
                    <h2 className="support-widget-messages-title">{t('chat', 'inboxTitle')}</h2>
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => setOpen(false)} aria-label={t('supportWidget', 'close')}>
                      <IoClose size={22} />
                    </button>
                  </div>
                  <div className="support-widget-inbox-search">
                    <MdSearch className="support-widget-inbox-search-icon" aria-hidden size={20} />
                    <input
                      type="search"
                      className="support-widget-inbox-search-input"
                      placeholder={t('chat', 'inboxSearchPlaceholder')}
                      value={convSearch}
                      onChange={(e) => setConvSearch(e.target.value)}
                    />
                  </div>
                </header>
                <div className="support-widget-messages-scroll">
                  {conversations.length === 0 ? (
                    <p className="support-widget-empty">{t('chat', 'noConversations')}</p>
                  ) : filteredConversations.length === 0 ? (
                    <p className="support-widget-empty">{t('chat', 'inboxSearchNoMatch')}</p>
                  ) : (
                    <ul className="support-widget-conv-list">
                      {filteredConversations.map((c) => {
                        const rid = c.restaurant?._id || c.restaurant;
                        const logoRaw = c.restaurant?.logo;
                        const logoStr = logoRaw && String(logoRaw).trim();
                        const logoUrl = logoStr
                          ? logoStr.startsWith('http')
                            ? logoStr
                            : `${MEDIA_BASE}${logoStr.startsWith('/') ? '' : '/'}${logoStr}`
                          : null;
                        return (
                          <li key={c._id}>
                            <button
                              type="button"
                              className="support-widget-conv-row"
                              onClick={() => {
                                setThreadRid(rid);
                                setThreadPid(null);
                                setView('thread');
                              }}
                            >
                              <span className="support-widget-conv-avatar" aria-hidden>
                                {logoUrl ? <img src={logoUrl} alt="" /> : <span className="support-widget-conv-avatar-fallback" />}
                              </span>
                              <span className="support-widget-conv-main">
                                <span className="support-widget-conv-name">{pickLocalized(language, c.restaurant, 'nom')}</span>
                                <span className="support-widget-conv-preview">{c.lastPreview || t('chat', 'noPreview')}</span>
                              </span>
                              <span className="support-widget-conv-meta">
                                {c.unreadClient > 0 ? (
                                  <span className="support-widget-unread-badge">{c.unreadClient > 99 ? '99+' : c.unreadClient}</span>
                                ) : null}
                                <MdChevronRight className="support-widget-chevron" />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {view === 'structures' ? (
              <div className="support-widget-structures">
                <header className="support-widget-messages-head support-widget-messages-head--wave support-widget-messages-head--simple">
                  <div className="support-widget-messages-head-row">
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => { setView('home'); setNavTab('home'); }} aria-label={t('supportWidget', 'back')}>
                      <MdChevronRight style={{ transform: 'rotate(180deg)' }} size={22} />
                    </button>
                    <h2 className="support-widget-messages-title">{t('supportWidget', 'structuresTitle')}</h2>
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => setOpen(false)} aria-label={t('supportWidget', 'close')}>
                      <IoClose size={22} />
                    </button>
                  </div>
                </header>
                <div className="support-widget-messages-scroll">
                  {structures.length === 0 ? (
                    <p className="support-widget-empty">{t('home', 'noStructuresFound')}</p>
                  ) : (
                    <ul className="support-widget-conv-list">
                      {structures.map((s) => (
                        <li key={s._id}>
                          <button type="button" className="support-widget-conv-row" onClick={() => openStructureThread(s._id)}>
                            <span className="support-widget-conv-name">{pickLocalized(language, s, 'nom')}</span>
                            <MdChevronRight className="support-widget-chevron" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {view === 'help' ? (
              <div className="support-widget-help">
                <header className="support-widget-messages-head support-widget-messages-head--wave support-widget-messages-head--simple">
                  <div className="support-widget-messages-head-row">
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => { setView('home'); setNavTab('home'); }} aria-label={t('supportWidget', 'back')}>
                      <MdChevronRight style={{ transform: 'rotate(180deg)' }} size={22} />
                    </button>
                    <h2 className="support-widget-messages-title">{t('supportWidget', 'navHelp')}</h2>
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => setOpen(false)} aria-label={t('supportWidget', 'close')}>
                      <IoClose size={22} />
                    </button>
                  </div>
                </header>
                <div className="support-widget-help-body">
                  <h3>{t('supportWidget', 'helpIntro')}</h3>
                  <p>{t('supportWidget', 'helpBody')}</p>
                </div>
              </div>
            ) : null}

            {view === 'tasks' ? (
              <div className="support-widget-help">
                <header className="support-widget-messages-head support-widget-messages-head--wave support-widget-messages-head--simple">
                  <div className="support-widget-messages-head-row">
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => { setView('home'); setNavTab('home'); }} aria-label={t('supportWidget', 'back')}>
                      <MdChevronRight style={{ transform: 'rotate(180deg)' }} size={22} />
                    </button>
                    <h2 className="support-widget-messages-title">{t('supportWidget', 'navTasks')}</h2>
                    <button type="button" className="support-widget-icon-btn support-widget-icon-btn--on-dark" onClick={() => setOpen(false)} aria-label={t('supportWidget', 'close')}>
                      <IoClose size={22} />
                    </button>
                  </div>
                </header>
                <div className="support-widget-help-body">
                  <p>{t('supportWidget', 'tasksHint')}</p>
                  <button type="button" className="support-widget-primary-btn" onClick={() => { setOpen(false); navigate('/orders'); }}>
                    {t('supportWidget', 'openOrders')}
                  </button>
                </div>
              </div>
            ) : null}

            {view === 'home' ? (
              <div className="support-widget-home">
                <header className="support-widget-hero">
                  <div className="support-widget-hero-top">
                    <div className="support-widget-brand">
                      <img src="/images/logo.png" alt="" className="support-widget-logo" />
                      <div className="support-widget-avatars" aria-hidden>
                        <span className="support-widget-avatar" />
                        <span className="support-widget-avatar" />
                        <span className="support-widget-avatar" />
                      </div>
                    </div>
                    <button type="button" className="support-widget-close-x" onClick={() => setOpen(false)} aria-label={t('supportWidget', 'close')}>
                      <IoClose size={24} />
                    </button>
                  </div>
                  <h1 className="support-widget-greeting">
                    {t('supportWidget', 'greetingHi')} {displayName}!
                  </h1>
                  <p className="support-widget-sub">{t('supportWidget', 'howHelp')}</p>
                </header>

                <div className="support-widget-body-scroll">
                  <div className="support-widget-card support-widget-status-card">
                    <MdCheckCircle className="support-widget-status-icon" aria-hidden />
                    <div>
                      <p className="support-widget-status-title">{t('supportWidget', 'statusOk')}</p>
                      <p className="support-widget-status-meta">
                        {t('supportWidget', 'statusUpdated')}{' '}
                        {new Date().toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="support-widget-card">
                    <div className="support-widget-search">
                      <MdSearch className="support-widget-search-icon" aria-hidden />
                      <input
                        type="search"
                        className="support-widget-search-input"
                        placeholder={t('supportWidget', 'searchHelp')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <ul className="support-widget-shortcuts">
                      {filteredShortcuts.map((s) => (
                        <li key={s.key}>
                          <button type="button" className="support-widget-shortcut-row" onClick={s.action}>
                            <span>{s.label}</span>
                            <MdChevronRight />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {!platformLoading && !platformId && (
                      <p className="support-widget-platform-warn">{t('supportWidget', 'platformUnavailable')}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="support-widget-ask-card"
                    disabled={!platformId}
                    onClick={() => platformId && openRapidoThread()}
                  >
                    <span>{t('supportWidget', 'askQuestion')}</span>
                    <MdChevronRight />
                  </button>
                </div>
              </div>
            ) : null}
            </div>

            {view !== 'thread' ? (
            <nav className="support-widget-bottom-nav" aria-label="Navigation">
              <button
                type="button"
                className={`support-widget-nav-btn ${navTab === 'home' && view === 'home' ? 'active' : ''}`}
                onClick={() => {
                  setView('home');
                  setNavTab('home');
                }}
              >
                <MdHome size={22} />
                <span>{t('supportWidget', 'navHome')}</span>
              </button>
              <button
                type="button"
                className={`support-widget-nav-btn ${navTab === 'messages' ? 'active' : ''}`}
                onClick={() => goMessagesList()}
              >
                <span className="support-widget-nav-icon-wrap">
                  <MdChatBubbleOutline size={22} />
                  {unreadMessages > 0 ? <span className="support-widget-nav-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span> : null}
                </span>
                <span>{t('supportWidget', 'navMessages')}</span>
              </button>
              <button
                type="button"
                className={`support-widget-nav-btn ${navTab === 'help' ? 'active' : ''}`}
                onClick={() => {
                  setView('help');
                  setNavTab('help');
                }}
              >
                <MdHelpOutline size={22} />
                <span>{t('supportWidget', 'navHelp')}</span>
              </button>
              <button
                type="button"
                className={`support-widget-nav-btn ${navTab === 'tasks' ? 'active' : ''}`}
                onClick={() => {
                  setView('tasks');
                  setNavTab('tasks');
                }}
              >
                <MdAssignmentTurnedIn size={22} />
                <span>{t('supportWidget', 'navTasks')}</span>
              </button>
            </nav>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SupportWidget;
