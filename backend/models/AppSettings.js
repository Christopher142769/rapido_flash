const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema(
  {
    maintenanceEnabled: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: '', maxlength: 2000 },
    dnsNoticeEnabled: { type: Boolean, default: false },
    dnsNoticeUrl: { type: String, default: '', maxlength: 500 },
    dnsNoticeMessage: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
