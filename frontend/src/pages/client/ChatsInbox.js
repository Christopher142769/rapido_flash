import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useSupportWidget } from '../../context/SupportWidgetContext';
import PageLoader from '../../components/PageLoader';
import LanguageContext from '../../context/LanguageContext';

/**
 * Ancienne route /chats : redirige vers l’accueil et ouvre le widget messagerie (liste).
 */
const ChatsInbox = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { openSupport } = useSupportWidget();

  useEffect(() => {
    if (user?.role && user.role !== 'client') {
      navigate('/home', { replace: true });
      return;
    }
    openSupport({ view: 'messages' });
    navigate('/home', { replace: true });
  }, [user, navigate, openSupport]);

  return <PageLoader message={t('chat', 'loading')} />;
};

export default ChatsInbox;
