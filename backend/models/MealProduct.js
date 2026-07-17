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

const optionChoiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** single = choix unique (radio) ; multiple = choix multiples (cases). */
    selectionType: { type: String, enum: ['single', 'multiple'], default: 'single' },
    /** Si true, le client doit sélectionner au moins un choix. */
    required: { type: Boolean, default: false },
    choices: { type: [optionChoiceSchema], default: [] },
  },
  { _id: true }
);

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

const mealProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortDescription: { type: String, default: '' },
    /** Blocs riches (texte, titre, image, vidéo, FAQ) — même format que Shop Express. */
    copySections: { type: [copySectionSchema], default: [] },
    images: { type: [String], default: [] },
    mainImage: { type: String, default: null },
    basePrice: { type: Number, required: true, min: 0 },
    /** Frais de livraison additionnels pour ce plat (souvent 0 — frais globaux boutique). */
    deliveryFee: { type: Number, default: 0, min: 0 },
    category: { type: String, default: '', trim: true },
    currency: { type: String, default: 'XOF' },
    published: { type: Boolean, default: false },
    /** Afficher le NB « livraison un jour après » sur la fiche produit. */
    showDeliveryNotice: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    accompagnements: { type: [accompagnementSchema], default: [] },
    /** Groupes d'options (choix unique/multiple, payants ou gratuits). */
    optionGroups: { type: [optionGroupSchema], default: [] },
    /** Autoriser le client à saisir une spécification de son plat. */
    allowSpecifications: { type: Boolean, default: true },
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
