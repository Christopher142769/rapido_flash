import React from 'react';
import StaffPresenceDashboard from '../restaurant/StaffPresenceDashboard';

export default function RhQrPage() {
  return (
    <div className="rh-presence-wrap">
      <header className="rh-page-head">
        <h1>Codes QR</h1>
        <p>
          QR actifs du jour (changent chaque minuit) et QR permanents — ajoutez des sites si besoin.
        </p>
      </header>
      <StaffPresenceDashboard variant="rh" section="qr" photosPath="/rh/photos" hidePageTitle />
    </div>
  );
}
