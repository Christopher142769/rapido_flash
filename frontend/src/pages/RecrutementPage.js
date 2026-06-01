import { useEffect } from 'react';

const STATIC_FILES = {
  index: '/recrutement/carrieres.html',
  merci: '/recrutement/merci.html',
};

/**
 * Sort du shell React : charge la page statique sur /recrutement ou /recrutement/merci
 * pour que l’URL dans le navigateur soit correcte (tracking, partage, etc.).
 */
export default function RecrutementPage({ page = 'index' }) {
  useEffect(() => {
    const path = page === 'merci' ? '/recrutement/merci' : '/recrutement';
    const staticFile = STATIC_FILES[page] || STATIC_FILES.index;
    const suffix = `${window.location.search || ''}${window.location.hash || ''}`;
    const reloadKey = `rapido-recrutement-reload:${path}`;

    if (window.location.pathname !== path) {
      window.location.replace(`${path}${suffix}`);
      return;
    }

    const root = document.getElementById('root');
    const inSpaShell = root && root.childElementCount > 0;

    if (inSpaShell) {
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(reloadKey);
      window.location.replace(`${staticFile}${suffix}`);
      return;
    }

    sessionStorage.removeItem(reloadKey);
  }, [page]);

  return null;
}
