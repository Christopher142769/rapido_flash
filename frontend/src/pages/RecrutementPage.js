import React from 'react';

const PAGES = {
  index: '/recrutement/carrieres.html',
  merci: '/recrutement/merci.html',
};

/**
 * Affiche la landing statique dans une iframe (Render sert /* → index.html).
 * Les liens « Postuler » dans carrieres.html utilisent target="_top" pour changer l’URL
 * vers /form/... dans la barre d’adresse (tracking Meta).
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
