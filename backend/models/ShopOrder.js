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
    shopProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopProduct',
      required: true,
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
    customer: { type: shopCustomerSchema, required: true },
    whatsappNumber: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'],
      default: 'en_attente',
      index: true,
    },
  },
  { timestamps: true }
);

shopOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
