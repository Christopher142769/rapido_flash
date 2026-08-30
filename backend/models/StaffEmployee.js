const mongoose = require('mongoose');
const { SITE_IDS } = require('../utils/staffPresenceSites');

const staffEmployeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    siteId: { type: String, enum: SITE_IDS, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

staffEmployeeSchema.index({ siteId: 1, normalizedName: 1 });
staffEmployeeSchema.index({ siteId: 1, active: 1, lastName: 1, firstName: 1 });

module.exports = mongoose.model('StaffEmployee', staffEmployeeSchema);
