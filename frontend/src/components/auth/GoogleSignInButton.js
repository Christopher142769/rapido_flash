import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const SCRIPT_ID = 'google-identity-services';

/** ID client OAuth de type « Application Web » (même valeur que GOOGLE_CLIENT_ID côté serveur pour le jeton ID). */
function resolveWebClientIdForNative() {
  const web = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  const cap = (process.env.REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR || '').trim();
  // Sur Android, GoogleSignInOptions.requestIdToken() exige le client **Web** ; si CAPACITOR = ID client Android → code 10 / jeton invalide.
  try {
    if (Capacitor.getPlatform() === 'android') {
      return web || cap;
    }
  } catch (_) {
    /* */
  }
  return cap || web;
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
/** Le plugin Android lit `scopes` via getString() : un tableau JS est ignoré → il faut une chaîne délimitée par des virgules. */
const GOOGLE_SCOPES_NATIVE_ARG = GOOGLE_SCOPES.join(',');

function extractNativeGoogleErrorText(err) {
  if (!err) return '';
  const code = err.code ?? err.statusCode;
  const bits = [
    err.message,
    err.errorMessage,
    err.localizedDescription,
    code != null && code !== '' ? `code:${code}` : '',
    typeof err === 'string' ? err : '',
  ].filter(Boolean);
  if (!bits.length && typeof err === 'object') {
    try {
      const s = JSON.stringify(err);
      if (s && s !== '{}') bits.push(s);
    } catch (_) {
      /* */
    }
  }
  return bits.join(' | ');
}

/** Interprète les erreurs du plugin Android (ex. ApiException 10 = mauvaise SHA-1 / client OAuth). */
function explainNativeGoogleFailure(errText) {
  const t = String(errText || '');
  if (!t) {
    return {
      hint: 'Connexion Google refusée sans détail. Vérifie la connexion, puis réessaie.',
    };
  }
  if (/canceled|cancelled|12501/i.test(t)) {
    return { skip: true };
  }
  if (/\b10\b|DEVELOPER_ERROR|developer[_ ]error|code:10\b|12500/i.test(t)) {
    return {
      hint:
        'Configuration Google Android : ajoute l’empreinte SHA-1 du certificat qui signe **cette** APK (ou celle « App signing » dans Play Console si l’app est sur le Play Store) dans Firebase / Google Cloud, pour le package bj.rapido.mobile. L’ID client OAuth utilisé doit être celui de type **Application Web** (le même que GOOGLE_CLIENT_ID sur Render).',
    };
  }
  if (/7\b|NETWORK_ERROR|network/i.test(t)) {
    return { hint: 'Réseau indisponible ou bloqué. Réessaie avec une connexion stable.' };
  }
  if (/8\b|INTERNAL_ERROR|internal/i.test(t)) {
    return { hint: 'Erreur interne Google. Réessaie dans quelques instants.' };
  }
  return {
    hint: 'La connexion Google n’a pas abouti. Vérifie l’ID client Web dans le build et la configuration côté Google Cloud.',
    detail: t.length > 220 ? `${t.slice(0, 220)}…` : t,
  };
}

/**
 * Google Sign-In : sur navigateur = GIS (gsi). Sur app Capacitor Android/iOS = SDK natif (@southdevs/capacitor-google-auth).
 */
const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const [scriptError, setScriptError] = useState(false);
  const [nativeErrorHint, setNativeErrorHint] = useState('');
  const [nativeErrorDetail, setNativeErrorDetail] = useState('');
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
      setNativeErrorHint('');
      setNativeErrorDetail('');
      try {
        const { GoogleAuth } = await import('@southdevs/capacitor-google-auth');
        const isAndroid = Capacitor.getPlatform() === 'android';
        // Android (Java) : scopes via getString() → chaîne "a,b,c". iOS : tableau + serverClientId (client Web) pour l’ID token backend.
        const nativeInit = isAndroid
          ? { clientId: webClientId, scopes: GOOGLE_SCOPES_NATIVE_ARG, grantOfflineAccess: false }
          : {
              clientId: webClientId,
              scopes: GOOGLE_SCOPES,
              grantOfflineAccess: false,
              serverClientId: webClientId,
            };
        await GoogleAuth.initialize(nativeInit);
        const user = await GoogleAuth.signIn(nativeInit);
        const idToken = user?.authentication?.idToken;
        setSignInBusy(false);
        if (idToken && typeof onCredentialRef.current === 'function') {
          onCredentialRef.current(idToken);
        } else {
          const detail = extractNativeGoogleErrorText({ message: 'Jeton ID absent après connexion' });
          const explained = explainNativeGoogleFailure(detail);
          if (!explained.skip) {
            setNativeErrorHint(explained.hint);
            setNativeErrorDetail(explained.detail || detail);
            setScriptError(true);
          }
        }
      } catch (err) {
        const raw = extractNativeGoogleErrorText(err);
        setSignInBusy(false);
        const explained = explainNativeGoogleFailure(raw);
        if (explained.skip) return;
        console.warn('[GoogleSignInButton] native Google sign-in', raw);
        setNativeErrorHint(explained.hint);
        setNativeErrorDetail(explained.detail || raw);
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
    setNativeErrorHint('');
    setNativeErrorDetail('');
    if (isNative) {
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
          Sur Android, définissez REACT_APP_GOOGLE_CLIENT_ID avec le client OAuth **Application Web** (pas l’ID client Android). Même valeur que GOOGLE_CLIENT_ID sur Render, puis reconstruisez l’app.
        </div>
      ) : null}
      {scriptError ? (
        <div className="google-auth-meta">
          <span className="google-auth-loading">
            {isNative ? nativeErrorHint || 'Connexion Google impossible.' : 'Connexion Google indisponible.'}
          </span>
          {isNative && nativeErrorDetail ? (
            <span className="google-auth-loading" style={{ display: 'block', fontSize: '0.82rem', opacity: 0.85, marginTop: 6 }}>
              {nativeErrorDetail}
            </span>
          ) : null}
          <button type="button" className="google-auth-retry" onClick={handleRetryLoad}>
            Réessayer
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default GoogleSignInButton;
