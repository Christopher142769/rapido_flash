import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhPersonnelPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Personnel</h1>
        <p>Gérez les employés actifs, les jours de repos et les contrats par site.</p>
      </header>
      <StaffPresenceDashboard variant="rh" section="employees" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
