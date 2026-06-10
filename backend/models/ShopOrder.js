const mongoose = require('mongoose');

const shopCustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    addressDescription: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const shopOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, trim: true, index: true },
    shopProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopProduct',
      required: function requiredShopProduct() {
        return !this.isOffPlatform;
      },
      index: true,
    },
    slug: { type: String, required: true, trim: true, lowercase: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.001 },
    quantityUnit: {
      type: String,
      enum: ['unit', 'kg', 'g', 'litre', 'tonne', 'm3'],
      default: 'unit',
    },
    quantityLabel: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, default: 0 },
    isPromoLive: { type: Boolean, default: false },
    discountPercent: { type: Number, default: 0 },
    freeDelivery: { type: Boolean, default: false },
    customer: {
      type: shopCustomerSchema,
      required: function requiredCustomer() {
        return !this.isOffPlatform;
      },
    },
    whatsappNumber: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'],
      default: 'en_attente',
      index: true,
    },
    /** Statut commercial : commande | confirme | relance | livree | annulee */
    commercialStatus: {
      type: String,
      enum: ['commande', 'confirme', 'relance', 'livree', 'annulee'],
      default: 'commande',
      index: true,
    },
    /** Date affichée dans le bilan (modifiable pour hors plateforme). */
    orderDate: { type: Date },
    /** Livraison demandée par le client (date ultérieure). */
    requestedDeliveryAt: { type: Date },
    /** Date/heure de relance planifiée. */
    scheduledDeliveryAt: { type: Date, index: true },
    isOffPlatform: { type: Boolean, default: false, index: true },
    offPlatformLocation: { type: String, default: '', trim: true },
    createdByCommercial: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    relanceNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

shopOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
