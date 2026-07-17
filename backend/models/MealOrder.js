const mongoose = require('mongoose');

const mealCustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    city: { type: String, required: true, trim: true },
    addressDescription: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const mealAccompagnementLineSchema = new mongoose.Schema(
  {
    accompagnementId: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const mealOptionLineSchema = new mongoose.Schema(
  {
    groupId: { type: String, default: '' },
    groupName: { type: String, required: true, trim: true },
    choiceId: { type: String, default: '' },
    choiceLabel: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const mealOrderItemSchema = new mongoose.Schema(
  {
    mealProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealProduct',
      required: true,
    },
    productName: { type: String, required: true, trim: true },
    slug: { type: String, default: '', trim: true, lowercase: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    basePrice: { type: Number, default: 0 },
    isPromoLive: { type: Boolean, default: false },
    discountPercent: { type: Number, default: 0 },
    accompagnements: { type: [mealAccompagnementLineSchema], default: [] },
    options: { type: [mealOptionLineSchema], default: [] },
    specifications: { type: String, default: '', trim: true },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const mealOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, trim: true, index: true },
    items: { type: [mealOrderItemSchema], required: true },
    subtotalPrice: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    freeDelivery: { type: Boolean, default: false },
    customer: { type: mealCustomerSchema, required: true },
    whatsappNumber: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee'],
      default: 'en_attente',
      index: true,
    },
    commercialStatus: {
      type: String,
      enum: ['commande', 'confirme', 'relance', 'livree', 'annulee'],
      default: 'commande',
      index: true,
    },
    orderDate: { type: Date },
    requestedDeliveryAt: { type: Date },
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    whatsappConfirmationSentAt: { type: Date },
    clientSpecifications: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

mealOrderSchema.index({ createdAt: 1 });
mealOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MealOrder', mealOrderSchema);
