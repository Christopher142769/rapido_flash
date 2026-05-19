const mongoose = require('mongoose');

const copySectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    body: { type: String, default: '' },
    icon: { type: String, trim: true, default: '' },
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
    currency: { type: String, default: 'XOF' },
    published: { type: Boolean, default: false },
    promo: {
      active: { type: Boolean, default: false },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      freeDelivery: { type: Boolean, default: false },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
    },
    whatsappNumber: { type: String, default: '', trim: true },
    contactPhone: { type: String, default: '', trim: true },
    ctaLabel: { type: String, default: 'Commander maintenant', trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shopProductSchema.index({ slug: 1 });
shopProductSchema.index({ published: 1, 'promo.active': 1 });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
