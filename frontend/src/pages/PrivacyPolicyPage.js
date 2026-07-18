import React, { useEffect } from 'react';
import './PrivacyPolicyPage.css';

/**
 * Route SPA /politique-confidentialite — charge le HTML officiel
 * (même contenu que /privacy.html) pour éviter une page blanche.
 */
export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Politique de confidentialité — Rapido';
  }, []);

  return (
    <div className="privacy-page privacy-page--iframe">
      <iframe
        className="privacy-page-iframe"
        title="Politique de confidentialité — Rapido"
        src="/privacy.html"
      />
    </div>
  );
}
