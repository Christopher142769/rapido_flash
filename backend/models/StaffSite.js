const mongoose = require('mongoose');

/** Site de présence personnel (extensible au-delà de Gbegamey / Zogbo). */
const staffSiteSchema = new mongoose.Schema(
  {
    /** Identifiant URL-safe : gbegamey, zogbo, akpakpa… */
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9][a-z0-9-]{0,47}$/, 'Identifiant site invalide'],
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    /** Référence GPS du site (contrôle des scans livreurs). */
    /** QR de livraison permanent (imprimable) — régénérable. */
    deliveryQrCode: { type: String, default: '', index: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    radiusM: { type: Number, default: 300, min: 30, max: 5000 },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

staffSiteSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('StaffSite', staffSiteSchema);
