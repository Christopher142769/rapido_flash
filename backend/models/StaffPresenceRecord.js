const mongoose = require('mongoose');

const KINDS = ['arrival', 'exit'];

const staffPresenceRecordSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    /** Clé dédup : prénom+nom normalisés. */
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    /** arrival = entrée / exit = sortie fin de service */
    kind: {
      type: String,
      enum: KINDS,
      required: true,
      default: 'arrival',
      index: true,
    },
    /** Jour civil Bénin (YYYY-MM-DD) — filtre dashboard. */
    dateKey: { type: String, required: true, trim: true },
    /** Horodatage serveur impératif (jamais fourni par le client). */
    checkedAt: { type: Date, required: true },
    code: { type: String, default: '', trim: true },
    checkedIp: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

staffPresenceRecordSchema.index({ dateKey: 1, kind: 1, checkedAt: -1 });
staffPresenceRecordSchema.index({ dateKey: 1, kind: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('StaffPresenceRecord', staffPresenceRecordSchema);
module.exports.KINDS = KINDS;
