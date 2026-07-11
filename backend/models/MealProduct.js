const mongoose = require('mongoose');

const accompagnementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
    /** Si true, le client doit en sélectionner au moins un (qty >= 1). */
    required: { type: Boolean, default: false },
    maxQuantity: { type: Number, default: 10, min: 1 },
  },
  { _id: true }
);

const mealProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortDescription: { type: String, default: '' },
    images: { type: [String], default: [] },
    mainImage: { type: String, default: null },
    basePrice: { type: Number, required: true, min: 0 },
    /** Frais de livraison additionnels pour ce plat (souvent 0 — frais globaux boutique). */
    deliveryFee: { type: Number, default: 0, min: 0 },
    category: { type: String, default: '', trim: true },
    currency: { type: String, default: 'XOF' },
    published: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    accompagnements: { type: [accompagnementSchema], default: [] },
    promo: {
      active: { type: Boolean, default: false },
      priceMode: { type: String, enum: ['percent', 'manual'], default: 'percent' },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      manualPrice: { type: Number, default: null, min: 0 },
      freeDelivery: { type: Boolean, default: false },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      runUntilStopped: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

mealProductSchema.index({ published: 1, sortOrder: 1, createdAt: -1 });
mealProductSchema.index({ category: 1 });

module.exports = mongoose.model('MealProduct', mealProductSchema);
