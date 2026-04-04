import React, { useContext, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import { useSupportWidget } from '../../context/SupportWidgetContext';
import PageLoader from '../../components/PageLoader';

/**
 * Ancienne route /chat/:id : ouvre le widget sur la conversation concernée.
 */
const ChatThread = () => {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const { openSupport } = useSupportWidget();
  const productId = searchParams.get('produit');

  useEffect(() => {
    if (user?.role && user.role !== 'client') {
      navigate('/home', { replace: true });
      return;
    }
    if (restaurantId) {
      openSupport({ restaurantId, productId: productId || null });
    } else {
      openSupport({ view: 'messages' });
    }
    navigate('/home', { replace: true });
  }, [user, navigate, openSupport, restaurantId, productId]);

  return <PageLoader message={t('chat', 'loading')} />;
};

export default ChatThread;
