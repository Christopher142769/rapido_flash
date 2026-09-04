import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhQrPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Codes QR</h1>
        <p>Générez, copiez ou imprimez les QR d’arrivée et de sortie pour chaque site.</p>
      </header>
      <StaffPresenceDashboard variant="rh" section="qr" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
