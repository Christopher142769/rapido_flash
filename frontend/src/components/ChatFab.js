import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaComments } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import './ChatFab.css';

/** Accès rapide à la messagerie (comptes clients) */
const ChatFab = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();
  const loc = useLocation();

  if (!user || user.role !== 'client') return null;
  if (loc.pathname.startsWith('/dashboard')) return null;
  if (loc.pathname === '/login' || loc.pathname === '/register') return null;
  if (loc.pathname === '/chats' || loc.pathname.startsWith('/chat/')) return null;

  return (
    <button
      type="button"
      className="chat-fab"
      aria-label={t('chat', 'fabAria')}
      title={t('chat', 'fabAria')}
      onClick={() => navigate('/chats')}
    >
      <FaComments size={22} />
    </button>
  );
};

export default ChatFab;
