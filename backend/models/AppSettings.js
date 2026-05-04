const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema(
  {
    maintenanceEnabled: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: '', maxlength: 2000 },
    dnsNoticeEnabled: { type: Boolean, default: false },
    dnsNoticeSourceDomain: { type: String, default: 'rapido.bj', maxlength: 100 },
    dnsNoticeUrl: { type: String, default: '', maxlength: 500 },
    dnsNoticeMessage: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
