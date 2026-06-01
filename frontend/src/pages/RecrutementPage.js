import React from 'react';

const PAGES = {
  index: '/recrutement/carrieres.html',
  merci: '/recrutement/merci.html',
};

/**
 * Affiche la landing statique (recrutement/carrieres.html) dans l’app React.
 * Nécessaire car Render sert /* → index.html : /recrutement seul ne charge pas le HTML statique.
 */
export default function RecrutementPage({ page = 'index' }) {
  const src = PAGES[page] || PAGES.index;
  const title =
    page === 'merci'
      ? 'Candidature reçue · RAPIDO'
      : 'RAPIDO · Carrières';

  return (
    <iframe
      title={title}
      src={src}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 100000,
        background: '#F6F1E8',
      }}
    />
  );
}
