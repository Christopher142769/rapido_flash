const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: '' },
    /** Galerie multi-images pour une slide (imageUrl = première). */
    imageUrls: { type: [String], default: [] },
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
    /**
     * Message NB livraison affiché sur les fiches produits où showDeliveryNotice est actif.
     * Shop Repas : livraison dans les prochaines 24 h (pas J+1).
     * Utiliser {date} pour la date du jour de commande si besoin.
     */
    deliveryNoticeMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
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
    /** WhatsApp ouvert via « Suivre ma commande » (Shop Repas). */
    trackingWhatsAppNumber: { type: String, default: '', trim: true },
    /**
     * Compteur / urgence de la page catalogue /repas uniquement.
     * Indépendant des promos Shop Express et des promos par plat.
     */
    urgency: {
      enabled: { type: Boolean, default: false },
      active: { type: Boolean, default: false },
      label: { type: String, default: 'Offre limitée — commandez vite', trim: true },
      expectedOrders: { type: Number, default: 0, min: 0 },
      durationHours: { type: Number, default: 48, min: 1, max: 720 },
      runUntilStopped: { type: Boolean, default: true },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealShopSettings', mealShopSettingsSchema);
