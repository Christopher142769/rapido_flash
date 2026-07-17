import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../InstallButton.css';
import './CuisineInstallPanel.css';

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function cuisineAppUrl() {
  if (typeof window === 'undefined') return '/cuisine/app';
  return `${window.location.origin.replace(/\/$/, '')}/cuisine/app`;
}

/** QR + lien + installation PWA pour l’espace cuisinier (page admin). */
export default function CuisineInstallPanel({ compact = false }) {
  const appUrl = useMemo(() => cuisineAppUrl(), []);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      /* ignore */
    }
  };

  const downloadManifest = () => {
    const a = document.createElement('a');
    a.href = '/cuisine-manifest.json';
    a.download = 'rapido-cuisine.webmanifest';
    a.click();
  };

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      } finally {
        setInstalling(false);
      }
      return;
    }
    setShowHelp(true);
  }, [deferredPrompt]);

  return (
    <div className={`cuisine-install-panel${compact ? ' cuisine-install-panel--compact' : ''}`}>
      <div className="cuisine-install-panel__head">
        <h2>App mobile cuisine</h2>
        <p>
          Installez l&apos;espace <strong>/cuisine/app</strong> sur le téléphone du cuisinier pour recevoir
          les notifications repas avec la sonnerie dédiée.
        </p>
      </div>

      <div className="cuisine-install-panel__grid">
        <div className="cuisine-install-panel__qr">
          <QRCodeSVG value={appUrl} size={compact ? 140 : 168} level="M" includeMargin />
          <span className="cuisine-install-panel__qr-hint">Scanner avec le téléphone</span>
        </div>

        <div className="cuisine-install-panel__actions">
          <p className="cuisine-install-panel__url">{appUrl}</p>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={copyLink}>
            {copied ? 'Lien copié ✓' : 'Copier le lien'}
          </button>
          <button
            type="button"
            className="commercial-btn commercial-btn--primary"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? 'Installation…' : 'Installer l’app cuisine'}
          </button>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={downloadManifest}>
            Télécharger le manifest (.webmanifest)
          </button>
          <button type="button" className="commercial-btn commercial-btn--outline" onClick={() => setShowHelp((v) => !v)}>
            {showHelp ? 'Masquer l’aide' : 'Aide installation mobile'}
          </button>
        </div>
      </div>

      {showHelp ? (
        <div className="cuisine-install-panel__help">
          {isIOSDevice() ? (
            <ol>
              <li>Ouvrir le lien dans <strong>Safari</strong>.</li>
              <li>Appuyer sur <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.</li>
              <li>Se connecter avec le compte cuisinier et autoriser les notifications.</li>
            </ol>
          ) : (
            <ol>
              <li>Ouvrir le lien dans <strong>Chrome</strong> sur le téléphone.</li>
              <li>Se connecter avec le compte cuisinier.</li>
              <li>Menu ⋮ → <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</li>
              <li>Accepter les notifications pour entendre la sonnerie repas.</li>
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
