const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    /**
     * Message NB livraison (Shop Express).
     * Utiliser {date} pour la date de livraison calculée.
     * Affiché sur les produits où showDeliveryNotice est actif.
     */
    deliveryNoticeMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    /** Frais de livraison (FCFA) par ville, appliqués à toutes les commandes Shop Express. */
    deliveryFeeCotonou: { type: Number, default: 700, min: 0 },
    deliveryFeeCalavi: { type: Number, default: 1000, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
