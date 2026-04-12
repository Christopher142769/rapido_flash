import React, { useState, useEffect, useContext } from 'react';
import { useModal } from '../context/ModalContext';
import LanguageContext from '../context/LanguageContext';
import './InstallButton.css';

const InstallButton = ({ variant = 'icon' }) => {
  const { showInfo, showWarning } = useModal();
  const { t } = useContext(LanguageContext);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [waitingForPrompt, setWaitingForPrompt] = useState(false);
  const ti = (key) => t('install', key);
  const browserName = (() => {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Brave/i.test(navigator.brave ? 'Brave' : '')) return 'Brave';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Arc\//.test(ua)) return 'Arc';
    if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'Safari';
    if (/Chrome\//.test(ua)) return 'Chrome';
    return 'navigateur';
  })();

  const waitForInstallPrompt = (timeoutMs = 4500) =>
    new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        resolve(value);
      };
      const onPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        done(e);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      window.addEventListener('beforeinstallprompt', onPrompt, { once: true });
    });

  useEffect(() => {
    // Détecter iOS (iPad, iPhone, iPod)
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Écouter l'événement beforeinstallprompt (Android/Desktop/macOS Chrome/Edge)
    // Cet événement fonctionne sur :
    // - Chrome/Edge sur Android
    // - Chrome/Edge sur Windows
    // - Chrome/Edge sur macOS
    // - Chrome/Edge sur Linux
    // Safari sur macOS ne supporte pas beforeinstallprompt, mais on peut afficher le bouton
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('Prompt d\'installation disponible (Chrome/Edge sur Desktop/Mobile)');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Attendre un peu pour que Chrome détermine si l'app est installable
    // Le prompt peut prendre quelques secondes à apparaître
    const checkPromptDelay = setTimeout(() => {
      if (!deferredPrompt && !isStandalone && !iOS) {
        console.log('beforeinstallprompt non disponible après 2 secondes');
        console.log('User Agent:', navigator.userAgent);
        console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);
        console.log('navigator.standalone:', window.navigator.standalone);
        console.log('Service Worker:', 'serviceWorker' in navigator);
        
        // Vérifier si le service worker est enregistré
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            console.log('Service Workers enregistrés:', registrations.length);
            if (registrations.length === 0) {
              console.warn('Aucun service worker enregistré - cela peut empêcher l\'installation');
            }
          });
        }
        
        // Vérifier le manifest
        fetch('/manifest.json')
          .then(res => res.json())
          .then(manifest => {
            console.log('Manifest.json chargé:', manifest);
            if (!manifest.icons || manifest.icons.length === 0) {
              console.warn('Manifest.json: Aucune icône définie');
            }
            if (!manifest.start_url) {
              console.warn('Manifest.json: start_url manquant');
            }
          })
          .catch(err => {
            console.error('❌ Erreur chargement manifest.json:', err);
          });
      }
    }, 2000);

    // Écouter l'événement appinstalled (quand l'app est installée)
    const handleAppInstalled = () => {
      console.log('Application installée avec succès');
      setIsInstalling(false);
      setInstallSuccess(true);
      setShowSuccessModal(true);
      setDeferredPrompt(null);
      
      // Rediriger vers l'app après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Pour iOS, vérifier périodiquement si l'app a été installée
    if (iOS) {
      const checkStandalone = setInterval(() => {
        if (window.navigator.standalone === true) {
          setIsStandalone(true);
          setShowIOSModal(false);
          clearInterval(checkStandalone);
        }
      }, 1000);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        clearInterval(checkStandalone);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(checkPromptDelay);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalling) return;

    if (isStandalone) {
      showInfo(
        ti('alreadyInstalledBody'),
        ti('alreadyInstalledTitle')
      );
      return;
    }

    // Pour iOS, afficher le modal avec les instructions
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Pour Safari sur macOS, afficher aussi un modal avec instructions
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent);
    
    if (isSafari && isMacOS && !deferredPrompt) {
      // Safari sur macOS ne supporte pas beforeinstallprompt
      // Afficher un modal avec instructions pour Safari
      setShowIOSModal(true);
      return;
    }

    // Si le prompt n'est pas encore prêt, le bouton attend automatiquement.
    if (!deferredPrompt) {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        showInfo(ti('alreadyInstalledShort'), ti('alreadyInstalledTitle'));
        return;
      }

      setWaitingForPrompt(true);
      const freshPrompt = await waitForInstallPrompt(5000);
      setWaitingForPrompt(false);

      if (!freshPrompt && !deferredPrompt) {
        setShowIOSModal(true);
        return;
      }
    }
    
    // Si on arrive ici, le prompt est disponible
    setWaitingForPrompt(false);

    setIsInstalling(true);
    
    try {
      // Afficher le prompt d'installation natif
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation');
        // L'événement appinstalled sera déclenché automatiquement
        // On garde isInstalling à true jusqu'à ce que appinstalled soit déclenché
      } else {
        console.log('❌ Utilisateur a refusé l\'installation');
        setIsInstalling(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error);
      setIsInstalling(false);
    }
  };

  // Conserver seulement le bouton "download" quand déjà installé
  if (isStandalone && variant !== 'download') {
    return null;
  }

  // Le bouton s'affiche toujours (iOS ou Android/Desktop)
  // Sur iOS, il affichera un modal avec instructions
  // Sur Android/Desktop, il utilisera le prompt natif

  if (variant === 'icon') {
    return (
      <>
        <button 
          className={`install-button-icon ${isInstalling ? 'installing' : ''} ${!deferredPrompt ? 'waiting' : ''}`}
          onClick={handleInstallClick}
          title={deferredPrompt ? ti('downloadTitle') : ti('soonTitle')}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <div className="install-spinner"></div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2 19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H20C20.5304 21 21.0391 20.7893 21.4142 20.4142C21.7893 20.0391 22 19.5304 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Modal de chargement */}
        {isInstalling && (
          <div className="install-loading-modal-overlay">
            <div className="install-loading-modal">
              <div className="install-loading-icon">
                <img src="/images/logo.png" alt="Rapido Logo" />
              </div>
              <div className="install-loading-spinner"></div>
              <h3>{ti('installingTitle')}</h3>
              <p>{ti('installingBody')}</p>
            </div>
          </div>
        )}

        {/* Modal de succès */}
        {showSuccessModal && installSuccess && (
          <div className="install-success-modal-overlay">
            <div className="install-success-modal">
              <div className="success-icon-wrapper">
                <div className="success-checkmark">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h2>{ti('successTitle')}</h2>
              <p>{ti('successBody')}</p>
              <p className="success-redirect">{ti('successRedirect')}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'download') {
    return (
      <>
        <button
          className={`install-button-download ${isInstalling ? 'installing' : ''} ${(!deferredPrompt && !waitingForPrompt) ? 'waiting' : ''} ${waitingForPrompt ? 'checking' : ''}`}
          onClick={handleInstallClick}
          title={deferredPrompt ? ti('downloadTitle') : waitingForPrompt ? ti('checkingTitle') : ti('downloadTitle')}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <div className="install-spinner-small" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2 19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H20C20.5304 21 21.0391 20.7893 21.4142 20.4142C21.7893 20.0391 22 19.5304 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{ti('downloadCta')}</span>
            </>
          )}
        </button>

        {isInstalling && (
          <div className="install-loading-modal-overlay">
            <div className="install-loading-modal">
              <div className="install-loading-icon">
                <img src="/images/logo.png" alt="Rapido Logo" />
              </div>
              <div className="install-loading-spinner"></div>
              <h3>{ti('installingTitle')}</h3>
              <p>{ti('installingBody')}</p>
            </div>
          </div>
        )}

        {showSuccessModal && installSuccess && (
          <div className="install-success-modal-overlay">
            <div className="install-success-modal">
              <div className="success-icon-wrapper">
                <div className="success-checkmark">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h2>{ti('successTitle')}</h2>
              <p>{ti('successBody')}</p>
              <p className="success-redirect">{ti('successRedirect')}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Variant pour la navbar du bas (mobile)
  return (
    <>
      <button 
        className={`install-button-navbar ${isInstalling ? 'installing' : ''} ${(!deferredPrompt && !waitingForPrompt) ? 'waiting' : ''} ${waitingForPrompt ? 'checking' : ''}`}
        onClick={handleInstallClick}
        title={deferredPrompt ? ti('downloadTitle') : waitingForPrompt ? ti('checkingTitle') : ti('soonTitle')}
        disabled={isInstalling || waitingForPrompt}
      >
        {isInstalling ? (
          <div className="install-spinner-small"></div>
        ) : (
          <>
            <svg className="nav-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2 19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H20C20.5304 21 21.0391 20.7893 21.4142 20.4142C21.7893 20.0391 22 19.5304 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="nav-label">{ti('downloadNav')}</span>
          </>
        )}
      </button>

      {/* Modal de chargement */}
      {isInstalling && (
        <div className="install-loading-modal-overlay">
          <div className="install-loading-modal">
            <div className="install-loading-icon">
              <img src="/images/logo.png" alt="Rapido Logo" />
            </div>
            <div className="install-loading-spinner"></div>
            <h3>{ti('installingTitle')}</h3>
            <p>{ti('installingBody')}</p>
          </div>
        </div>
      )}

      {/* Modal de succès */}
      {showSuccessModal && installSuccess && (
        <div className="install-success-modal-overlay">
          <div className="install-success-modal">
            <div className="success-icon-wrapper">
              <div className="success-checkmark">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h2>{ti('successTitle')}</h2>
            <p>{ti('successBody')}</p>
            <p className="success-redirect">{ti('successRedirect')}</p>
          </div>
        </div>
      )}

      {/* Modal iOS avec instructions */}
      {showIOSModal && (
        <div className="ios-install-modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ios-modal-close" onClick={() => setShowIOSModal(false)}>×</button>
            <div className="ios-modal-content">
              <div className="ios-modal-icon">
                <img src="/images/logo.png" alt="Rapido Logo" />
              </div>
              <h3>{ti('iosModalTitle')}</h3>
              <p className="ios-modal-description">
                {isIOS 
                  ? ti('iosModalDescIOS')
                  : `${ti('iosModalDescDesktop')} (${browserName})`
                }
              </p>
              {isIOS ? (
                <div className="ios-instructions-container">
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">1</div>
                    <div className="ios-step-content">
                      <p>{ti('iosStep1')}</p>
                      <p className="ios-step-hint">{ti('iosStep1Hint')}</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">2</div>
                    <div className="ios-step-content">
                      <p>{ti('iosStep2')}</p>
                      <p className="ios-step-hint">{ti('iosStep2Hint')}</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">3</div>
                    <div className="ios-step-content">
                      <p>{ti('iosStep3')}</p>
                      <p className="ios-step-hint">{ti('iosStep3Hint')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ios-instructions-container">
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">1</div>
                    <div className="ios-step-content">
                      <p>{ti('desktopStep1')}</p>
                      <p className="ios-step-hint">{ti('desktopStep1Hint')}</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">2</div>
                    <div className="ios-step-content">
                      <p>{ti('desktopStep2')}</p>
                      <p className="ios-step-hint">{ti('desktopStep2Hint')}</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">3</div>
                    <div className="ios-step-content">
                      <p>{ti('desktopStep3')}</p>
                      <p className="ios-step-hint">{ti('desktopStep3Hint')}</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step" style={{ marginTop: '20px', padding: '15px', background: 'rgba(139, 69, 19, 0.1)', borderRadius: '10px' }}>
                    <div className="ios-step-content" style={{ textAlign: 'center', width: '100%' }}>
                      <p style={{ fontWeight: '600', color: 'var(--primary-brown)', marginBottom: '5px' }}>{ti('desktopTipTitle')}</p>
                      <p className="ios-step-hint">{ti('desktopTipBody')}</p>
                    </div>
                  </div>
                </div>
              )}
              <button className="ios-modal-got-it" onClick={() => setShowIOSModal(false)}>
                {ti('understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallButton;
