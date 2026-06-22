const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: true }
);

const copySectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['text', 'title', 'image', 'video', 'faq'],
      default: 'text',
    },
    title: { type: String, trim: true, default: '' },
    body: { type: String, default: '' },
    icon: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
    faqItems: { type: [faqItemSchema], default: [] },
  },
  { _id: true }
);

const shopProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortDescription: { type: String, default: '' },
    copySections: { type: [copySectionSchema], default: [] },
    images: { type: [String], default: [] },
    mainImage: { type: String, default: null },
    basePrice: { type: Number, required: true, min: 0 },
    /** Frais de livraison (FCFA) si la promo « livraison gratuite » n’est pas active. */
    deliveryFee: { type: Number, default: 0, min: 0 },
    quantityUnit: {
      type: String,
      enum: ['unit', 'kg', 'g', 'litre', 'tonne', 'm3'],
      default: 'unit',
    },
    currency: { type: String, default: 'XOF' },
    published: { type: Boolean, default: false },
    promo: {
      active: { type: Boolean, default: false },
      /** percent = réduction % ; manual = prix promo fixe (manualPrice) */
      priceMode: { type: String, enum: ['percent', 'manual'], default: 'percent' },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      manualPrice: { type: Number, default: null, min: 0 },
      freeDelivery: { type: Boolean, default: false },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      /** Si true (ou fiche publiée + promo active), la promo ne s’éteint pas à endsAt — arrêt manuel uniquement. */
      runUntilStopped: { type: Boolean, default: false },
    },
    whatsappNumber: { type: String, default: '', trim: true },
    contactPhone: { type: String, default: '', trim: true },
    ctaLabel: { type: String, default: 'Commander maintenant', trim: true },
    sortOrder: { type: Number, default: 0 },
    /** Fermeture quotidienne automatique (fiche boostée). */
    shopClosure: {
      enabled: { type: Boolean, default: false },
      /** Heure de fermeture chaque jour (HH:mm, fuseau Bénin). */
      dailyCloseTime: { type: String, default: '', trim: true },
      /** Heure de réouverture chaque jour (HH:mm). */
      dailyOpenTime: { type: String, default: '', trim: true },
      message: { type: String, default: '', trim: true, maxlength: 500 },
      /** open = vente exceptionnelle hors horaire ; closed = fermeture manuelle immédiate. */
      manualOverride: { type: String, enum: [null, '', 'open', 'closed'], default: null },
      /** @deprecated Ancien mode date unique — migré vers dailyCloseTime/dailyOpenTime */
      closedFrom: { type: Date, default: null },
      closedUntil: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

shopProductSchema.index({ slug: 1 });
shopProductSchema.index({ published: 1, 'promo.active': 1 });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
