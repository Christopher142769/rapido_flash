const mongoose = require('mongoose');

const staffEmployeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true, default: '·' },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    siteId: { type: String, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    /** Jours de repos récurrents (ISO : 1 = lundi … 7 = dimanche). */
    restDays: { type: [Number], default: [] },
    /** Jours travaillés par semaine (ex. Gloria = 4). */
    contractDaysPerWeek: { type: Number, default: 5, min: 1, max: 7 },
    /** 'livreur' : accès au flux livraison (QR + signature client). */
    role: { type: String, enum: ['staff', 'livreur'], default: 'staff', index: true },
    pinHash: { type: String, default: '', select: false },
    pinFailures: { type: Number, default: 0, select: false },
    pinLockedUntil: { type: Date, default: null, select: false },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

staffEmployeeSchema.index({ siteId: 1, normalizedName: 1 });
staffEmployeeSchema.index({ siteId: 1, active: 1, lastName: 1, firstName: 1 });

module.exports = mongoose.model('StaffEmployee', staffEmployeeSchema);
