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
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
