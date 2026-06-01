import React, { useEffect, useCallback } from 'react';
import { trackMeta } from '../utils/metaPixel';

const PAGES = {
  index: '/recrutement/carrieres.html',
  merci: '/recrutement/merci.html',
};

/**
 * Landing statique en iframe (Render → index.html).
 * Les clics Postuler dans carrieres.html envoient des évènements Meta au parent via postMessage.
 */
export default function RecrutementPage({ page = 'index' }) {
  const src = PAGES[page] || PAGES.index;
  const title =
    page === 'merci'
      ? 'Candidature reçue · RAPIDO'
      : 'RAPIDO · Carrières';

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.source !== 'rapido-recrutement') return;
      const { event: eventName, params } = event.data;
      if (eventName) trackMeta(eventName, params || {});
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const onIframeLoad = useCallback(() => {
    if (page === 'merci') {
      trackMeta('CompleteRegistration', {
        content_name: 'Candidature reçue',
        content_category: 'Recrutement',
      });
    } else {
      trackMeta('ViewContent', {
        content_name: 'Page Carrières',
        content_category: 'Recrutement',
      });
    }
  }, [page]);

  return (
    <iframe
      title={title}
      src={src}
      onLoad={onIframeLoad}
      allow="autoplay; clipboard-write"
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
