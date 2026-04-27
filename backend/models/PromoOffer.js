const mongoose = require('mongoose');

const promoOfferSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 90,
    },
    // Code promo défini manuellement depuis le dashboard (ex: FLASH10).
    publicCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true,
    },
    // Portée de l'offre: entreprise ciblée ou toute la plateforme.
    scopeType: {
      type: String,
      enum: ['restaurant', 'platform'],
      default: 'restaurant',
      index: true,
    },
    // all_products = tous les produits de la portée, selected_products = sous-ensemble.
    productScope: {
      type: String,
      enum: ['all_products', 'selected_products'],
      default: 'all_products',
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produit',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    rules: {
      // Si true, un code généré est prévu pour un usage unique.
      singleUseCode: { type: Boolean, default: true },
      // Limite globale optionnelle sur l’offre (somme de tous les usages des codes de l’offre).
      maxTotalUses: { type: Number, default: null, min: 1 },
      // Règle audience préconfigurée pour la génération.
      audience: {
        type: String,
        enum: ['manual', 'new_users', 'all_users', 'first_new_users'],
        default: 'all_users',
      },
      firstNewUsersCount: { type: Number, default: 0, min: 0 },
      newUsersWindowDays: { type: Number, default: 30, min: 1, max: 3650 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoOffer', promoOfferSchema);
