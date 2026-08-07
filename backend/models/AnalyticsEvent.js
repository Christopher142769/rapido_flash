const mongoose = require('mongoose');

const CHANNELS = ['shop', 'repas', 'platform', 'recrutement', 'other'];
const EVENTS = [
  'page_view',
  'product_view',
  'product_click',
  'cta_click',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'lead',
  'complete_registration',
  'custom',
];

const analyticsEventSchema = new mongoose.Schema(
  {
    event: { type: String, enum: EVENTS, required: true, index: true },
    channel: { type: String, enum: CHANNELS, default: 'other', index: true },
    path: { type: String, default: '', trim: true, index: true },
    url: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    referrer: { type: String, default: '', trim: true },
    sessionId: { type: String, default: '', trim: true, index: true },
    visitorId: { type: String, default: '', trim: true, index: true },
    productId: { type: String, default: '', trim: true, index: true },
    productName: { type: String, default: '', trim: true },
    productSlug: { type: String, default: '', trim: true },
    ctaId: { type: String, default: '', trim: true },
    ctaLabel: { type: String, default: '', trim: true },
    orderId: { type: String, default: '', trim: true },
    orderModel: {
      type: String,
      enum: ['', 'ShopOrder', 'MealOrder', 'Commande'],
      default: '',
    },
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'XOF' },
    utmSource: { type: String, default: '', trim: true, index: true },
    utmMedium: { type: String, default: '', trim: true },
    utmCampaign: { type: String, default: '', trim: true, index: true },
    utmContent: { type: String, default: '', trim: true },
    utmTerm: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', maxlength: 500 },
    meta: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ channel: 1, event: 1, createdAt: -1 });
analyticsEventSchema.index({ path: 1, event: 1, createdAt: -1 });
analyticsEventSchema.index({ utmCampaign: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
module.exports.CHANNELS = CHANNELS;
module.exports.EVENTS = EVENTS;
