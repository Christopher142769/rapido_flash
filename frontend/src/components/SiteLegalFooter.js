import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DASHBOARD_BASE_PATH } from '../config/dashboardPath';
import './SiteLegalFooter.css';

/** Espaces où le pied de page n'a pas lieu d'être (back-office, outils internes, connexion). */
const HIDDEN_PREFIXES = [
  DASHBOARD_BASE_PATH,
  '/dashboard',
  '/cuisine',
  '/champion',
  '/responsables',
  '/commerciaux',
  '/rh',
  '/livreur',
  '/présence',
  '/presence',
  '/login',
  '/register',
  '/loading',
  '/welcome',
  '/location',
  '/recrutement',
  /** Pages qui affichent déjà leurs propres liens légaux dans leur pied de page. */
  '/repas',
  '/shop',
];

export default function SiteLegalFooter() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <footer className="site-legal-footer">
      <Link to="/mentions-legales">Mentions légales</Link>
      <span aria-hidden="true">·</span>
      <Link to="/politique-confidentialite">Politique de confidentialité</Link>
      <span aria-hidden="true">·</span>
      <span className="site-legal-footer-brand">© Rapido</span>
    </footer>
  );
}
