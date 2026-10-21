import React from 'react';
import LivreursPanel from './LivreursPanel';

export default function LivreursDashboardPage() {
  return (
    <div className="commercial-page" style={{ padding: 16 }}>
      <h1>Présence — Livreurs</h1>
      <LivreursPanel />
    </div>
  );
}
