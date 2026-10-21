import React from 'react';
import LivreursPanel from '../restaurant/LivreursPanel';

export default function RhLivreursPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Livreurs</h1>
        <p>Heures d’arrivée et de sortie, livraisons scannées, signatures clients, anomalies et journal d’audit.</p>
      </header>
      <LivreursPanel />
    </div>
  );
}
