import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhPlanningPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Planning</h1>
        <p>Activez ou désactivez le planning, attribuez les plages et le binôme par jour.</p>
      </header>
      <StaffPresenceDashboard variant="rh" section="planning" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
