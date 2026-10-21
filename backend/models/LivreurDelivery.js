const mongoose = require('mongoose');

const geoSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracy: Number,
    distanceM: { type: Number, default: null },
    inZone: { type: Boolean, default: null },
  },
  { _id: false }
);

/** Une livraison = début (scan QR) → fin (scan QR) → signature client. */
const livreurDeliverySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffEmployee', required: true },
    livreurName: { type: String, required: true, trim: true },
    siteId: { type: String, required: true, index: true },
    dateKey: { type: String, required: true, index: true },
    /** active → awaiting_signature (fin scannée) → completed | cancelled */
    status: {
      type: String,
      enum: ['active', 'awaiting_signature', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    startedAt: { type: Date, required: true },
    endScannedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    /** Contexte saisi au départ (n° commande, destination…). */
    orderRef: { type: String, default: '', trim: true, maxlength: 80 },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    startGeo: { type: geoSchema, default: null },
    endGeo: { type: geoSchema, default: null },
    signGeo: { type: geoSchema, default: null },
    clientName: { type: String, default: '', trim: true, maxlength: 120 },
    clientPhone: { type: String, default: '', trim: true, maxlength: 30 },
    signatureKey: { type: String, default: '', index: true },
    signatureMime: { type: String, default: '' },
    signatureSha256: { type: String, default: '', index: true },
    signatureData: { type: Buffer, select: false },
    flags: { type: [String], default: [] },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

/** Garantie serveur : un seul parcours non terminé par livreur. */
livreurDeliverySchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'awaiting_signature'] } },
  }
);
livreurDeliverySchema.index({ dateKey: 1, startedAt: -1 });

module.exports = mongoose.model('LivreurDelivery', livreurDeliverySchema);
