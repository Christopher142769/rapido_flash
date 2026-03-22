const AppSettings = require('../models/AppSettings');

async function ensureAppSettings() {
  try {
    const n = await AppSettings.countDocuments();
    if (n === 0) {
      await AppSettings.create({
        maintenanceEnabled: false,
        maintenanceMessage:
          'Nous effectuons une courte maintenance pour améliorer votre expérience. Merci de revenir très bientôt !',
      });
      console.log('✅ AppSettings par défaut créé');
    }
  } catch (e) {
    console.error('ensureAppSettings:', e.message);
  }
}

module.exports = ensureAppSettings;
