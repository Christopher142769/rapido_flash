import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const SCRIPT_ID = 'google-identity-services';

/** ID client OAuth de type « Application Web » (même valeur que GOOGLE_CLIENT_ID côté serveur pour le jeton ID). */
function resolveWebClientIdForNative() {
  const a = (process.env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR || '').trim();
  const b = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  return a || b;
}

function resolveGoogleClientId() {
  try {
    if (Capacitor.isNativePlatform() && process.env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR) {
      return process.env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR;
    }
  } catch (_) {
    /* */
  }
  return process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
}

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'));
      return;
    }
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gsi script')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gsi load'));
    document.head.appendChild(script);
  });
}

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

/**
 * Google Sign-In : sur navigateur = GIS (gsi). Sur app Capacitor Android/iOS = SDK natif (@southdevs/capacitor-google-auth).
 */
const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const [scriptError, setScriptError] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);
  const clientId = resolveGoogleClientId();
  const isNative = (() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  })();
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || isNative) return undefined;
    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (!cancelled) {
          /* script prêt pour le clic */
        }
      })
      .catch(() => {
        if (!cancelled) setScriptError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, isNative]);

  const handleGoogleClick = useCallback(async () => {
    if (disabled) return;

    if (isNative) {
      const webClientId = resolveWebClientIdForNative();
      if (!webClientId) {
        setScriptError(true);
        return;
      }
      setSignInBusy(true);
      setScriptError(false);
      try {
        const { GoogleAuth } = await import('@southdevs/capacitor-google-auth');
        await GoogleAuth.initialize({
          clientId: webClientId,
          scopes: GOOGLE_SCOPES,
          grantOfflineAccess: false,
        });
        const user = await GoogleAuth.signIn({
          clientId: webClientId,
          scopes: GOOGLE_SCOPES,
          grantOfflineAccess: false,
        });
        const idToken = user?.authentication?.idToken;
        setSignInBusy(false);
        if (idToken && typeof onCredentialRef.current === 'function') {
          onCredentialRef.current(idToken);
        } else {
          setScriptError(true);
        }
      } catch (err) {
        const msg = String(err?.message || err || '');
        setSignInBusy(false);
        if (/canceled|cancelled|12501/i.test(msg)) {
          return;
        }
        console.warn('[GoogleSignInButton] native Google sign-in', msg);
        setScriptError(true);
      }
      return;
    }

    if (!clientId) return;
    setSignInBusy(true);
    setScriptError(false);
    try {
      await loadGsiScript();
      if (!window.google?.accounts?.id) {
        throw new Error('gsi unavailable');
      }
      try {
        window.google.accounts.id.cancel();
      } catch (_) {
        /* */
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          setSignInBusy(false);
          if (response?.credential && typeof onCredentialRef.current === 'function') {
            onCredentialRef.current(response.credential);
          } else {
            setScriptError(true);
          }
        },
        use_fedcm_for_prompt: false,
        auto_select: false,
      });
      const failSafe = setTimeout(() => {
        setSignInBusy(false);
      }, 10000);
      window.google.accounts.id.prompt(() => {
        clearTimeout(failSafe);
        setSignInBusy(false);
      });
    } catch (err) {
      console.warn('[GoogleSignInButton] Google sign-in init failed', err?.message || err);
      setSignInBusy(false);
      setScriptError(true);
    }
  }, [clientId, disabled, isNative]);

  const handleRetryLoad = useCallback(() => {
    const el = document.getElementById(SCRIPT_ID);
    if (el) el.remove();
    setScriptError(false);
    if (isNative) {
      setScriptError(false);
      return;
    }
    loadGsiScript()
      .then(() => {})
      .catch(() => setScriptError(true));
  }, [isNative]);

  const showSpinner = signInBusy;

  return (
    <div className={`google-auth-wrap ${disabled ? 'google-auth-wrap--disabled' : ''}`}>
      {!clientId && !isNative ? (
        <button type="button" className="google-auth-fallback" disabled>
          Continuer avec Google
        </button>
      ) : (
        <button
          type="button"
          className="google-auth-custom-btn"
          onClick={handleGoogleClick}
          disabled={disabled}
          aria-busy={signInBusy}
        >
          <span className="google-auth-custom-btn__icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.21 37.92 48 31.8 48 24c0-1.64-.15-3.26-.43-4.85z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          </span>
          <span className="google-auth-custom-btn__label">Continuer avec Google</span>
          {showSpinner ? <span className="google-auth-custom-btn__spinner" aria-hidden /> : null}
        </button>
      )}
      {!clientId && !isNative ? (
        <div className="google-auth-loading">Activez REACT_APP_GOOGLE_CLIENT_ID (ou REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR en app native).</div>
      ) : null}
      {isNative && !resolveWebClientIdForNative() ? (
        <div className="google-auth-loading">
          Définissez REACT_APP_GOOGLE_CLIENT_ID (client Web OAuth, même valeur que GOOGLE_CLIENT_ID sur le serveur) puis reconstruisez l’app.
        </div>
      ) : null}
      {scriptError ? (
        <div className="google-auth-meta">
          <span className="google-auth-loading">
            {isNative
              ? 'Connexion Google impossible. Vérifie que l’ID client Web est dans le build (.env), que GOOGLE_CLIENT_ID sur Render correspond, et que l’empreinte SHA-1 de signature est enregistrée dans la console Google pour l’app Android.'
              : 'Connexion Google indisponible.'}
          </span>
          <button type="button" className="google-auth-retry" onClick={handleRetryLoad}>
            Réessayer
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default GoogleSignInButton;
