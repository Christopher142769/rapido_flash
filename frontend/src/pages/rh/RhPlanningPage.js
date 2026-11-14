import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhPlanningPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Planning</h1>
        <p>Planning indicatif (plages, binômes, repos). Il ne bloque pas le pointage : chacun scanne librement, selfie obligatoire.</p>
      </header>
      <StaffPresenceDashboard variant="rh" section="planning" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
