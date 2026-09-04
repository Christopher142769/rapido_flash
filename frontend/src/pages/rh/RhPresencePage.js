import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClipboardList,
  FaImages,
  FaQrcode,
  FaUsers,
} from 'react-icons/fa';

const LINKS = [
  { to: '/rh/qr', title: 'Codes QR', desc: 'Arrivée et sortie par site', Icon: FaQrcode },
  { to: '/rh/personnel', title: 'Personnel', desc: 'Registre des employés', Icon: FaUsers },
  { to: '/rh/planning', title: 'Planning', desc: 'Plages et jours de repos', Icon: FaCalendarAlt },
  { to: '/rh/registre', title: 'Registre', desc: 'Pointages et exports', Icon: FaClipboardList },
  { to: '/rh/photos', title: 'Photos', desc: 'Selfies et export ZIP', Icon: FaImages },
];

export default function RhPresencePage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Vue d’ensemble</h1>
        <p>Espace ressources humaines King Fish — présence, planning et contrôles des sites.</p>
      </header>

      <div className="rh-overview-grid">
        {LINKS.map(({ to, title, desc, Icon }) => (
          <Link key={to} to={to} className="rh-overview-card">
            <span className="rh-overview-icon" aria-hidden>
              <Icon />
            </span>
            <strong>{title}</strong>
            <span>{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
