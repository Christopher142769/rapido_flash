import React, { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'google-identity-services';

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const btnRef = useRef(null);
  const [ready, setReady] = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId) return undefined;
    const render = () => {
      if (!window.google?.accounts?.id || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential && typeof onCredential === 'function') {
            onCredential(response.credential);
          }
        },
      });
      btnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 340,
        text: 'continue_with',
      });
      setReady(true);
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      render();
      return undefined;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
    return undefined;
  }, [clientId, onCredential]);

  return (
    <div className={`google-auth-wrap ${disabled ? 'google-auth-wrap--disabled' : ''}`}>
      {clientId ? <div ref={btnRef} /> : (
        <button type="button" className="google-auth-fallback" disabled>
          Continuer avec Google
        </button>
      )}
      {!clientId ? <div className="google-auth-loading">Activez REACT_APP_GOOGLE_CLIENT_ID pour Google.</div> : null}
      {clientId && !ready ? <div className="google-auth-loading">Chargement Google…</div> : null}
    </div>
  );
};

export default GoogleSignInButton;
