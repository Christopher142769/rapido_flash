const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    ctaLabel: { type: String, trim: true, default: '' },
    ctaHref: { type: String, trim: true, default: '#meal-products' },
  },
  { _id: true }
);

const trustItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const mealShopSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    heroSlides: { type: [heroSlideSchema], default: [] },
    trustItems: { type: [trustItemSchema], default: [] },
    promoBanner: {
      active: { type: Boolean, default: false },
      title: { type: String, default: '', trim: true },
      subtitle: { type: String, default: '', trim: true },
      ctaLabel: { type: String, default: 'Voir les plats', trim: true },
    },
    categories: { type: [String], default: [] },
    /** Frais de livraison globaux (FCFA) pour toute la commande. */
    deliveryFee: { type: Number, default: 500, min: 0 },
    shopClosure: {
      enabled: { type: Boolean, default: false },
      dailyCloseTime: { type: String, default: '', trim: true },
      dailyOpenTime: { type: String, default: '', trim: true },
      message: { type: String, default: '', trim: true, maxlength: 500 },
      manualOverride: { type: String, enum: [null, '', 'open', 'closed'], default: null },
    },
    dailyOrderLimit: {
      enabled: { type: Boolean, default: false },
      maxOrders: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealShopSettings', mealShopSettingsSchema);
