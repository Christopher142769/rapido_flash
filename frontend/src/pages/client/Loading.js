import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import './Loading.css';

const Loading = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    // Enregistrer le service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker enregistré:', registration);
        })
        .catch((error) => {
          console.log('❌ Erreur enregistrement Service Worker:', error);
        });
    }

    // Attendre que le chargement de l'authentification soit terminé
    if (!loading) {
      const timer = setTimeout(() => {
        // Si l'utilisateur est connecté, rediriger vers la page d'accueil
        if (isAuthenticated && user) {
          navigate('/home');
        } else {
          // Si l'utilisateur n'est pas connecté, rediriger vers la page de bienvenue (onboarding)
          // Le flow sera : welcome → location → register/login → home
          navigate('/welcome');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [navigate, loading, isAuthenticated, user]);

  return (
    <div className="loading-page">
      <div className="loading-content">
        <div className="logo-container">
          <img 
            src="/images/logo.png" 
            alt="Rapido Logo" 
            className="logo-animated"
          />
        </div>
        <div className="spinner"></div>
      </div>
    </div>
  );
};

export default Loading;
