import React from 'react';
import StaffPresencePhotosPage from '../restaurant/StaffPresencePhotosPage';

export default function RhPhotosPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Galerie photos</h1>
        <p>Selfies d’arrivée et de sortie, filtrables et exportables en ZIP.</p>
      </header>
      <StaffPresencePhotosPage variant="rh" backPath="/rh/registre" hidePageTitle />
    </div>
  );
}
