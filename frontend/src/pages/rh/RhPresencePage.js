import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhPresencePage() {
  return (
    <div className="rh-presence-wrap">
      <section className="rh-hero">
        <h1>Présence du personnel</h1>
        <p>
          Gérez les sites Gbegamey et Zogbo, les plannings, les pointages et les exports —
          espace réservé aux ressources humaines.
        </p>
      </section>
      <StaffPresenceDashboard variant="rh" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
