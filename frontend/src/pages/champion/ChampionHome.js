import React from 'react';
import { Link } from 'react-router-dom';
import './champion.css';

export default function ChampionHome() {
  return (
    <div className="champion-shell champion-shell--centered">
      <div className="champion-topbar">
        <Link to="/home" className="champion-brand">
          <img src="/images/logo.png" alt="Rapido" />
          Champion
        </Link>
      </div>

      <div className="champion-hero">
        <h1>Devenez livreur Rapido Flash</h1>
        <p>
          Rejoignez l’équipe Champion : courses flexibles, gains transparents, paiement Mobile Money.
        </p>
      </div>

      <div className="champion-card">
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#555', lineHeight: 1.6 }}>
          <li>Inscription guidée en 7 étapes</li>
          <li>Commandes près de vous, triées par proximité</li>
          <li>Preuve de livraison par code client</li>
          <li>Portefeuille et retraits MoMo</li>
        </ul>
      </div>

      <div className="champion-bottom-actions">
        <Link to="/champion/inscription" className="champion-btn champion-btn--primary">
          Commencer l’inscription
        </Link>
        <Link to="/login?next=/champion/app" className="champion-btn champion-btn--secondary">
          J’ai déjà un compte
        </Link>
      </div>
    </div>
  );
}
