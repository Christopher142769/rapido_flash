const mongoose = require('mongoose');

const championSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    profilePhotoUrl: { type: String, default: '' },
    email: { type: String, lowercase: true, trim: true, index: true },
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, trim: true, default: '' },
    whatsApp: { type: String, trim: true, default: '' },
    whatsAppSameAsPhone: { type: Boolean, default: false },
    idCardFrontUrl: { type: String, default: '' },
    idCardBackUrl: { type: String, default: '' },
    idCardNumber: { type: String, trim: true, default: '' },
    vehicleType: {
      type: String,
      enum: ['moto', 'velo', 'voiture', 'pied', ''],
      default: '',
    },
    workZone: { type: String, trim: true, default: '' },
    momoNetwork: { type: String, enum: ['mtn', 'moov', ''], default: '' },
    momoNumber: { type: String, trim: true, default: '' },
    momoAccountName: { type: String, trim: true, default: '' },
    termsAcceptedAt: { type: Date, default: null },
    accountStatus: {
      type: String,
      enum: ['draft', 'pending_validation', 'active', 'rejected', 'suspended'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    suspensionReason: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    location: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    todayStats: {
      deliveries: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 },
      distanceKm: { type: Number, default: 0 },
      dateKey: { type: String, default: '' },
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

championSchema.index({ accountStatus: 1, workZone: 1, isOnline: 1 });

module.exports = mongoose.model('Champion', championSchema);
