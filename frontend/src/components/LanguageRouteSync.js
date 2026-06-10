import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LanguageContext from '../context/LanguageContext';
import { applyGoogleTranslate } from '../utils/googleTranslate';

/** Ré-applique la traduction automatique après chaque navigation SPA. */
export default function LanguageRouteSync() {
  const { language } = useContext(LanguageContext);
  const location = useLocation();

  useEffect(() => {
    if (language === 'en') {
      const id = setTimeout(() => applyGoogleTranslate('en'), 350);
      return () => clearTimeout(id);
    }
    applyGoogleTranslate('fr');
    return undefined;
  }, [language, location.pathname, location.search]);

  return null;
}
