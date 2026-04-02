import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import TopNavbar from '../../components/TopNavbar';
import BottomNavbar from '../../components/BottomNavbar';
import { pickLocalized } from '../../utils/i18nContent';
import './ChatsInbox.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ChatsInbox = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [list, setList] = useState([]);
  const [locationAddress, setLocationAddress] = useState('');

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
    axios
      .get(`${API_URL}/conversations/client`)
      .then((res) => setList(res.data || []))
      .catch(() => setList([]));
  }, []);

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
        <h1 className="chats-inbox-title">{t('chat', 'inboxTitle')}</h1>
        {list.length === 0 ? (
          <p className="chats-inbox-empty">{t('chat', 'noConversations')}</p>
        ) : (
          <ul className="chats-inbox-list">
            {list.map((c) => {
              const rid = c.restaurant?._id || c.restaurant;
              const name = c.restaurant ? pickLocalized(language, c.restaurant, 'nom') : '—';
              return (
                <li key={c._id}>
                  <button
                    type="button"
                    className="chats-inbox-item"
                    onClick={() => navigate(`/chat/${rid}`)}
                  >
                    <span className="chats-inbox-name">{name}</span>
                    {c.unreadClient > 0 ? <span className="chats-inbox-badge">{c.unreadClient}</span> : null}
                    <span className="chats-inbox-preview">{c.lastPreview}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNavbar />
    </div>
  );
};

export default ChatsInbox;
