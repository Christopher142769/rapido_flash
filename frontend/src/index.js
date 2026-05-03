import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './fedapay-checkout-mobile.css';
import App from './App';
import {
  initCapacitorAndroidNotifications,
  scheduleAndroidNotificationPermissionPrompt,
} from './utils/capacitorNativeNotifications';
import { ensureCapacitorFcmListeners } from './utils/capacitorFcm';

initCapacitorAndroidNotifications();
ensureCapacitorFcmListeners();
scheduleAndroidNotificationPermissionPrompt();

// Dev : désinscrire tout SW (évite conflits avec le serveur de dev)
if (process.env.NODE_ENV !== 'production' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// Prod : une fois au chargement, forcer la prise en compte du nouveau script SW (remplace v1/v2 qui interceptaient fetch)
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.update());
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
