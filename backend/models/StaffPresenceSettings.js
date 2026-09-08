const mongoose = require('mongoose');

/** QR permanents + tokens journaliers (arrivée / sortie). */
const staffPresenceSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    /** @deprecated migré vers arrivalCode — conservé pour les anciens QR déjà imprimés */
    code: { type: String, trim: true, sparse: true },
    arrivalCode: { type: String, trim: true, sparse: true, unique: true },
    exitCode: { type: String, trim: true, sparse: true, unique: true },
    /** Date (Africa/Porto-Novo YYYY-MM-DD) des tokens journaliers. */
    dailyTokenDateKey: { type: String, trim: true, default: '', index: true },
    arrivalDailyCode: { type: String, trim: true, sparse: true, unique: true },
    exitDailyCode: { type: String, trim: true, sparse: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffPresenceSettings', staffPresenceSettingsSchema);
