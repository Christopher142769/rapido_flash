import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import { FaChevronRight, FaComments, FaStore } from 'react-icons/fa';
import { pickLocalized } from '../../utils/i18nContent';
import './ChatsInbox.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || API_URL.replace(/\/api\/?$/, '');

function resolveLogoUrl(logo) {
  if (!logo) return '';
  const s = String(logo).trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `${BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
}

function formatListTime(iso, language) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const locale = language === 'en' ? 'en-GB' : 'fr-FR';
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return language === 'en' ? 'Yesterday' : 'Hier';
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

const ChatsInbox = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationAddress, setLocationAddress] = useState('');

  const fetchList = useCallback(() => {
    return axios
      .get(`${API_URL}/conversations/client`)
      .then((res) => setList(res.data || []))
      .catch(() => setList([]));
  }, []);

  useEffect(() => {
    const updateLocationAddress = () => {
      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      setLocationAddress(
        userLocation.adresse ||
          `${userLocation.latitude?.toFixed(4) || '--'}, ${userLocation.longitude?.toFixed(4) || '--'}`
      );
    };
    updateLocationAddress();
    window.addEventListener('locationUpdated', updateLocationAddress);
    return () => window.removeEventListener('locationUpdated', updateLocationAddress);
  }, []);

  useEffect(() => {
    if (user?.role && user.role !== 'client') {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchList]);

  return (
    <div className="chats-inbox-page">
      <TopNavbar
        locationAddress={locationAddress}
        onLocationClick={() => navigate('/home')}
        searchTerm=""
        onSearchChange={() => {}}
        sectionLinks={[]}
      />

      <main className="chats-inbox-main">
        <header className="chats-inbox-hero">
          <div className="chats-inbox-hero-icon" aria-hidden>
            <FaComments />
          </div>
          <div>
            <h1 className="chats-inbox-title">{t('chat', 'inboxTitle')}</h1>
            <p className="chats-inbox-subtitle">{t('chat', 'inboxSubtitle')}</p>
          </div>
        </header>

        {loading ? (
          <ul className="chats-inbox-skeleton" aria-hidden>
            {[1, 2, 3].map((i) => (
              <li key={i} className="chats-inbox-skeleton-row">
                <span className="chats-inbox-skeleton-avatar" />
                <span className="chats-inbox-skeleton-lines">
                  <span className="chats-inbox-skeleton-line chats-inbox-skeleton-line--short" />
                  <span className="chats-inbox-skeleton-line chats-inbox-skeleton-line--long" />
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && list.length === 0 ? (
          <div className="chats-inbox-empty">
            <div className="chats-inbox-empty-icon" aria-hidden>
              <FaComments />
            </div>
            <p className="chats-inbox-empty-text">{t('chat', 'noConversations')}</p>
            <p className="chats-inbox-empty-hint">{t('chat', 'inboxEmptyHint')}</p>
          </div>
        ) : null}

        {!loading && list.length > 0 ? (
          <ul className="chats-inbox-list">
            {list.map((c) => {
              const rid = c.restaurant?._id || c.restaurant;
              const name = c.restaurant ? pickLocalized(language, c.restaurant, 'nom') : '—';
              const logoUrl = c.restaurant ? resolveLogoUrl(c.restaurant.logo) : '';
              const preview = (c.lastPreview || '').trim() || t('chat', 'noPreview');
              const timeLabel = formatListTime(c.lastMessageAt, language);
              const unread = Number(c.unreadClient) > 0;

              return (
                <li key={c._id}>
                  <button
                    type="button"
                    className={`chats-inbox-item ${unread ? 'chats-inbox-item--unread' : ''}`}
                    onClick={() => navigate(`/chat/${rid}`)}
                  >
                    <span className="chats-inbox-avatar" aria-hidden>
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="chats-inbox-avatar-img" />
                      ) : (
                        <FaStore className="chats-inbox-avatar-icon" />
                      )}
                    </span>
                    <span className="chats-inbox-item-body">
                      <span className="chats-inbox-item-top">
                        <span className="chats-inbox-name">{name}</span>
                        {timeLabel ? <span className="chats-inbox-time">{timeLabel}</span> : null}
                      </span>
                      <span className="chats-inbox-preview">{preview}</span>
                    </span>
                    <span className="chats-inbox-item-meta">
                      {unread ? <span className="chats-inbox-badge">{c.unreadClient > 99 ? '99+' : c.unreadClient}</span> : null}
                      <FaChevronRight className="chats-inbox-chevron" aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </main>
      <BottomNavbar />
    </div>
  );
};

export default ChatsInbox;
