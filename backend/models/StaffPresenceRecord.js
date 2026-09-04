const mongoose = require('mongoose');
const { SITE_IDS } = require('../utils/staffPresenceSites');
const { SHIFT_IDS } = require('../utils/staffPresenceShifts');

const KINDS = ['arrival', 'exit'];

const staffPresenceRecordSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    /** Peut être vide (employés au prénom seul). */
    lastName: { type: String, default: '', trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffEmployee', index: true },
    siteId: { type: String, enum: SITE_IDS, default: 'gbegamey', index: true },
    shift: { type: String, enum: SHIFT_IDS, required: true, index: true },
    shiftWindowKey: { type: String, required: true, trim: true, index: true },
    kind: {
      type: String,
      enum: KINDS,
      required: true,
      default: 'arrival',
      index: true,
    },
    dateKey: { type: String, required: true, trim: true },
    checkedAt: { type: Date, required: true },
    selfieUrl: { type: String, default: '', trim: true },
    workedMinutes: { type: Number, default: null },
    overtimeMinutes: { type: Number, default: null },
    code: { type: String, default: '', trim: true },
    checkedIp: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

staffPresenceRecordSchema.index({ dateKey: 1, kind: 1, checkedAt: -1 });
staffPresenceRecordSchema.index({ siteId: 1, dateKey: 1, kind: 1, checkedAt: -1 });
staffPresenceRecordSchema.index(
  { siteId: 1, shiftWindowKey: 1, kind: 1, employeeId: 1 },
  { unique: true, sparse: true }
);
/** Rétrocompat anciens enregistrements sans employeeId */
staffPresenceRecordSchema.index(
  { dateKey: 1, kind: 1, normalizedName: 1, siteId: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $exists: false } } }
);

module.exports = mongoose.model('StaffPresenceRecord', staffPresenceRecordSchema);
module.exports.KINDS = KINDS;
