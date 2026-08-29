import React from 'react';
import { Link } from 'react-router-dom';
import './public/RapidoFormTheme.css';
import './public/BassinsFormTheme.css';

const LOGO_SRC = '/recrutement/logo.png';

export default function BassinsRemerciementsPage() {
  return (
    <div className="rform-root rform-root--bassins">
      <header className="rform-header">
        <nav className="rform-nav">
          <Link to="/bassins" className="rform-logo">
            <img src={LOGO_SRC} alt="RAPIDO Livraison Express" width="512" height="512" />
            <small>Bassins Rapido</small>
          </Link>
        </nav>
      </header>
      <section className="rform-hero rform-thanks rform-thanks--bassins">
        <div className="rform-hero-glow" />
        <div className="rform-hero-glow two" />
        <div className="rform-wrap">
          <svg className="rform-seal" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="ring" cx="60" cy="60" r="38" />
            <path className="check" d="M 44,61 L 55,72 L 78,49" />
          </svg>
          <h1 className="rform-thanks-title">
            Merci,
            <br />
            votre réponse a été enregistrée
          </h1>
          <p className="rform-lead">
            Un technicien Rapido vous rappelle sous 24 h pour valider votre commande.
          </p>
        </div>
      </section>
    </div>
  );
}
