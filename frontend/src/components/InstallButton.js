import React, { useState, useEffect } from 'react';
import { useModal } from '../context/ModalContext';
import './InstallButton.css';

const InstallButton = ({ variant = 'icon' }) => {
  const { showInfo, showWarning } = useModal();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [waitingForPrompt, setWaitingForPrompt] = useState(false);

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
      console.log('✅ Prompt d\'installation disponible (Chrome/Edge sur Desktop/Mobile)');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Attendre un peu pour que Chrome détermine si l'app est installable
    // Le prompt peut prendre quelques secondes à apparaître
    const checkPromptDelay = setTimeout(() => {
      if (!deferredPrompt && !isStandalone && !iOS) {
        console.log('⚠️ beforeinstallprompt non disponible après 2 secondes');
        console.log('User Agent:', navigator.userAgent);
        console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);
        console.log('navigator.standalone:', window.navigator.standalone);
        console.log('Service Worker:', 'serviceWorker' in navigator);
        
        // Vérifier si le service worker est enregistré
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            console.log('Service Workers enregistrés:', registrations.length);
            if (registrations.length === 0) {
              console.warn('⚠️ Aucun service worker enregistré - cela peut empêcher l\'installation');
            }
          });
        }
        
        // Vérifier le manifest
        fetch('/manifest.json')
          .then(res => res.json())
          .then(manifest => {
            console.log('✅ Manifest.json chargé:', manifest);
            if (!manifest.icons || manifest.icons.length === 0) {
              console.warn('⚠️ Manifest.json: Aucune icône définie');
            }
            if (!manifest.start_url) {
              console.warn('⚠️ Manifest.json: start_url manquant');
            }
          })
          .catch(err => {
            console.error('❌ Erreur chargement manifest.json:', err);
          });
      }
    }, 2000);

    // Écouter l'événement appinstalled (quand l'app est installée)
    const handleAppInstalled = () => {
      console.log('✅ Application installée avec succès');
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

    // Pour Chrome/Edge sur macOS/Windows/Linux, si le prompt n'est pas disponible
    if (!deferredPrompt) {
      // Vérifier si l'app est peut-être déjà installée
      if (window.matchMedia('(display-mode: standalone)').matches) {
        showInfo('L\'application est déjà installée !', 'Application installée');
        return;
      }
      
      // Pour Chrome/Edge, le prompt peut prendre quelques secondes à apparaître
      // Afficher un message plus informatif avec des instructions alternatives
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
      const isEdge = /Edge|Edg/.test(navigator.userAgent);
      
      if (isChrome || isEdge) {
        setWaitingForPrompt(true);
        
        // Attendre encore 3 secondes pour voir si le prompt arrive
        setTimeout(() => {
          setWaitingForPrompt(false);
          if (!deferredPrompt) {
            const message = `L'installation n'est pas encore disponible.\n\n` +
              `Vérifications nécessaires :\n` +
              `✓ Le site doit être en HTTPS (actuellement: ${window.location.protocol})\n` +
              `✓ Le manifest.json doit être valide\n` +
              `✓ Un service worker doit être enregistré\n\n` +
              `Alternative : Utilisez le menu Chrome/Edge\n` +
              `Menu (⋮) → Installer Rapido...\n\n` +
              `Ou attendez quelques secondes et réessayez.`;
            showInfo(message, 'Installation');
          }
        }, 3000);
        
        // Si le prompt arrive pendant l'attente, on l'utilisera
        return;
      } else {
        showInfo('L\'installation sera bientôt disponible. Veuillez rafraîchir la page dans quelques instants.\n\nAstuce : Utilisez Chrome ou Edge pour une meilleure expérience PWA.', 'Installation');
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
        console.log('✅ Utilisateur a accepté l\'installation');
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

  // Ne pas afficher si déjà installé
  if (isStandalone) {
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
          title={deferredPrompt ? "Télécharger l'application Rapido" : "Installation bientôt disponible"}
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
              <h3>Installation en cours...</h3>
              <p>Veuillez patienter pendant l'installation de l'application</p>
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
              <h2>✅ Installation réussie !</h2>
              <p>L'application Rapido a été installée avec succès.</p>
              <p className="success-redirect">Ouverture de l'application...</p>
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
        title={deferredPrompt ? "Télécharger l'application Rapido" : waitingForPrompt ? "Vérification en cours..." : "Installation bientôt disponible"}
        disabled={isInstalling || waitingForPrompt}
      >
        {isInstalling ? (
          <div className="install-spinner-small"></div>
        ) : (
          <>
            <svg className="nav-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2 19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H20C20.5304 21 21.0391 20.7893 21.4142 20.4142C21.7893 20.0391 22 19.5304 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="nav-label">Installer</span>
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
            <h3>Installation en cours...</h3>
            <p>Veuillez patienter pendant l'installation de l'application</p>
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
            <h2>✅ Installation réussie !</h2>
            <p>L'application Rapido a été installée avec succès.</p>
            <p className="success-redirect">Ouverture de l'application...</p>
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
              <h3>Installer Rapido</h3>
              <p className="ios-modal-description">
                {isIOS 
                  ? "Ajoutez Rapido à votre écran d'accueil pour une expérience optimale"
                  : "Ajoutez Rapido à votre Dock (macOS) ou installez l'application"
                }
              </p>
              {isIOS ? (
                <div className="ios-instructions-container">
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">1</div>
                    <div className="ios-step-content">
                      <p>Appuyez sur le bouton <strong>Partager</strong> <span className="ios-icon">📤</span></p>
                      <p className="ios-step-hint">(en bas de l'écran dans Safari)</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">2</div>
                    <div className="ios-step-content">
                      <p>Sélectionnez <strong>"Sur l'écran d'accueil"</strong> <span className="ios-icon">➕</span></p>
                      <p className="ios-step-hint">(dans le menu de partage)</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">3</div>
                    <div className="ios-step-content">
                      <p>Appuyez sur <strong>"Ajouter"</strong></p>
                      <p className="ios-step-hint">(en haut à droite)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ios-instructions-container">
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">1</div>
                    <div className="ios-step-content">
                      <p>Dans la barre d'adresse, cliquez sur l'icône <strong>Partager</strong> <span className="ios-icon">📤</span></p>
                      <p className="ios-step-hint">(ou utilisez le menu Fichier → Partager)</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">2</div>
                    <div className="ios-step-content">
                      <p>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong> <span className="ios-icon">➕</span></p>
                      <p className="ios-step-hint">(ou "Add to Dock" sur macOS)</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step">
                    <div className="ios-step-number">3</div>
                    <div className="ios-step-content">
                      <p>Cliquez sur <strong>"Ajouter"</strong> pour confirmer</p>
                      <p className="ios-step-hint">(l'application apparaîtra dans votre Dock)</p>
                    </div>
                  </div>
                  <div className="ios-instruction-step" style={{ marginTop: '20px', padding: '15px', background: 'rgba(139, 69, 19, 0.1)', borderRadius: '10px' }}>
                    <div className="ios-step-content" style={{ textAlign: 'center', width: '100%' }}>
                      <p style={{ fontWeight: '600', color: 'var(--primary-brown)', marginBottom: '5px' }}>
                        💡 Astuce : Utilisez Chrome ou Edge pour une installation automatique
                      </p>
                      <p className="ios-step-hint">
                        Ces navigateurs proposent un bouton d'installation dans la barre d'adresse
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button className="ios-modal-got-it" onClick={() => setShowIOSModal(false)}>
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallButton;
