import React from 'react';
import StaffPresencePhotosPage from '../restaurant/StaffPresencePhotosPage';

export default function RhPhotosPage() {
  return (
    <div className="rh-presence-wrap">
      <section className="rh-hero">
        <h1>Galerie photos</h1>
        <p>Selfies d’arrivée et de sortie, filtrables et exportables en ZIP.</p>
      </section>
      <StaffPresencePhotosPage variant="rh" backPath="/rh" hidePageTitle />
    </div>
  );
}
