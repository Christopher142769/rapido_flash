const express = require('express');
const AppSettings = require('../models/AppSettings');
const { auth } = require('../middleware/auth');
const { canManageMaintenance } = require('../utils/maintenanceAccess');

const router = express.Router();

/** Public : état maintenance (sans auth) */
router.get('/public', async (req, res) => {
  try {
    let doc = await AppSettings.findOne();
    if (!doc) {
      doc = await AppSettings.create({
        maintenanceEnabled: false,
        maintenanceMessage: '',
      });
    }
    res.json({
      maintenanceEnabled: !!doc.maintenanceEnabled,
      maintenanceMessage: doc.maintenanceMessage || '',
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce paramètre.' });
    }
    const { maintenanceEnabled, maintenanceMessage } = req.body;
    let doc = await AppSettings.findOne();
    if (!doc) doc = new AppSettings();

    if (typeof maintenanceEnabled === 'boolean') doc.maintenanceEnabled = maintenanceEnabled;
    if (typeof maintenanceMessage === 'string') {
      doc.maintenanceMessage = maintenanceMessage.slice(0, 2000);
    }
    await doc.save();
    res.json({
      maintenanceEnabled: !!doc.maintenanceEnabled,
      maintenanceMessage: doc.maintenanceMessage || '',
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  }
});

module.exports = router;
