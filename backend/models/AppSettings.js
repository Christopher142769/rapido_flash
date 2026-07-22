const mongoose = require('mongoose');

const twoFactorByRoleSchema = new mongoose.Schema(
  {
    restaurant: { type: Boolean, default: true },
    gestionnaire: { type: Boolean, default: true },
    commercial: { type: Boolean, default: true },
    cuisinier: { type: Boolean, default: true },
    livreur: { type: Boolean, default: true },
    responsable: { type: Boolean, default: true },
  },
  { _id: false }
);

const appSettingsSchema = new mongoose.Schema(
  {
    maintenanceEnabled: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: '', maxlength: 2000 },
    dnsNoticeEnabled: { type: Boolean, default: false },
    dnsNoticeSourceDomain: { type: String, default: 'rapido.bj', maxlength: 100 },
    dnsNoticeUrl: { type: String, default: '', maxlength: 500 },
    dnsNoticeMessage: { type: String, default: '', maxlength: 2000 },
    /** Double authentification login par rôle staff (client toujours sans 2FA). */
    twoFactorByRole: { type: twoFactorByRoleSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
