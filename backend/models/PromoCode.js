const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoOffer',
      required: true,
      index: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ['manual', 'new_users', 'all_users', 'first_new_users'],
      default: 'manual',
    },
    maxUses: {
      type: Number,
      default: 1,
      min: 1,
    },
    useCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedByOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commande',
      default: null,
    },
    usedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);
