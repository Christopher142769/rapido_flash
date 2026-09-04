import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhRegistrePage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Registre</h1>
        <p>Consultez les arrivées et sorties, filtrez les heures sup. et exportez en PDF ou Excel.</p>
      </header>
      <StaffPresenceDashboard variant="rh" section="records" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
