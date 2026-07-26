const mongoose = require('mongoose');

/** QR permanent unique pour le pointage du personnel. */
const staffPresenceSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    code: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffPresenceSettings', staffPresenceSettingsSchema);
