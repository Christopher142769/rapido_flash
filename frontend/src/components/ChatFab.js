import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { FaComments } from 'react-icons/fa';
import { MdExpandMore } from 'react-icons/md';
import AuthContext from '../context/AuthContext';
import LanguageContext from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { useSupportWidget } from '../context/SupportWidgetContext';
import './ChatFab.css';

/** Bouton flottant : ouvre le centre d’aide / messagerie (overlay, pas une page) */
const ChatFab = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { unreadMessages } = useNotifications();
  const loc = useLocation();
  const { open, setOpen, openSupport } = useSupportWidget();

  if (!user || user.role !== 'client') return null;
  if (loc.pathname !== '/home') return null;
  return (
    <button
      type="button"
      className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
      aria-label={open ? t('supportWidget', 'fabClose') : t('supportWidget', 'fabOpen')}
      title={open ? t('supportWidget', 'fabClose') : t('supportWidget', 'fabOpen')}
      onClick={() => (open ? setOpen(false) : openSupport())}
    >
      {open ? <MdExpandMore size={26} /> : <FaComments size={22} />}
      {!open && unreadMessages > 0 && (
        <span className="chat-fab-badge" aria-hidden>
          {unreadMessages > 99 ? '99+' : unreadMessages}
        </span>
      )}
    </button>
  );
};

export default ChatFab;
