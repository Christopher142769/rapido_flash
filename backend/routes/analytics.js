const express = require('express');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const ShopOrder = require('../models/ShopOrder');
const MealOrder = require('../models/MealOrder');
const Commande = require('../models/Commande');
const { auth, isRestaurant } = require('../middleware/auth');

const router = express.Router();

const TZ = 'Africa/Porto-Novo';
const VALID_EVENTS = new Set(AnalyticsEvent.EVENTS || []);
const VALID_CHANNELS = new Set(AnalyticsEvent.CHANNELS || []);

function inferChannel(path, explicit) {
  if (explicit && VALID_CHANNELS.has(explicit)) return explicit;
  const p = String(path || '').toLowerCase();
  if (p.startsWith('/shop')) return 'shop';
  if (p.startsWith('/repas')) return 'repas';
  if (p.startsWith('/recrutement') || p.startsWith('/form')) return 'recrutement';
  if (
    p.startsWith('/cart') ||
    p.startsWith('/checkout') ||
    p.startsWith('/ordered') ||
    p.startsWith('/restaurant') ||
    p.startsWith('/home') ||
    p === '/' ||
    p.startsWith('/orders') ||
    p.startsWith('/facture')
  ) {
    return 'platform';
  }
  return 'other';
}

function parseDayBound(iso, endOfDay = false) {
  const s = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  // Africa/Porto-Novo = UTC+1 all year
  if (endOfDay) return new Date(`${s}T23:59:59.999+01:00`);
  return new Date(`${s}T00:00:00.000+01:00`);
}

function todayKeyBenin() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function buildDateFilter(from, to) {
  const start = parseDayBound(from || todayKeyBenin(), false);
  const end = parseDayBound(to || from || todayKeyBenin(), true);
  if (!start || !end) return null;
  return { $gte: start, $lte: end };
}

function normalizePathInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return `${u.pathname}${u.search}` || '/';
    }
  } catch {
    /* ignore */
  }
  return s.startsWith('/') ? s : `/${s}`;
}

function pathMatchFilter(pathQuery) {
  const path = normalizePathInput(pathQuery);
  if (!path) return {};
  // Match exact path or prefix (page tree)
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { path: { $regex: `^${escaped}` } };
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((Number(num) / Number(den)) * 1000) / 10;
}

function sanitizeString(v, max = 500) {
  return String(v || '').trim().slice(0, max);
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.ip || '';
}

/** Public beacon — events from the site. */
router.post('/beacon', async (req, res) => {
  try {
    const body = req.body || {};
    let event = sanitizeString(body.event, 64).toLowerCase();
    if (!VALID_EVENTS.has(event)) event = 'custom';

    const path = sanitizeString(body.path || (body.url ? normalizePathInput(body.url) : ''), 400);
    const channel = inferChannel(path, sanitizeString(body.channel, 32).toLowerCase());

    const doc = {
      event,
      channel,
      path,
      url: sanitizeString(body.url, 800),
      title: sanitizeString(body.title, 200),
      referrer: sanitizeString(body.referrer, 800),
      sessionId: sanitizeString(body.sessionId, 80),
      visitorId: sanitizeString(body.visitorId, 80),
      productId: sanitizeString(body.productId, 80),
      productName: sanitizeString(body.productName, 200),
      productSlug: sanitizeString(body.productSlug, 200),
      ctaId: sanitizeString(body.ctaId, 80),
      ctaLabel: sanitizeString(body.ctaLabel, 120),
      orderId: sanitizeString(body.orderId, 80),
      orderModel: ['ShopOrder', 'MealOrder', 'Commande'].includes(body.orderModel)
        ? body.orderModel
        : '',
      value: Math.max(0, Number(body.value) || 0),
      currency: sanitizeString(body.currency || 'XOF', 8) || 'XOF',
      utmSource: sanitizeString(body.utmSource || body.utm?.source, 120),
      utmMedium: sanitizeString(body.utmMedium || body.utm?.medium, 120),
      utmCampaign: sanitizeString(body.utmCampaign || body.utm?.campaign, 160),
      utmContent: sanitizeString(body.utmContent || body.utm?.content, 160),
      utmTerm: sanitizeString(body.utmTerm || body.utm?.term, 160),
      userAgent: sanitizeString(req.headers['user-agent'], 500),
    };

    if (body.meta && typeof body.meta === 'object') {
      doc.meta = { ...body.meta, ip: clientIp(req) };
    }

    // Fire-and-forget friendly: acknowledge fast
    await AnalyticsEvent.create(doc);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

async function countOrdersInRange(from, to, channel) {
  const createdAt = buildDateFilter(from, to);
  if (!createdAt) return { shop: 0, repas: 0, platform: 0 };

  const [shop, repas, platform] = await Promise.all([
    channel && channel !== 'shop'
      ? 0
      : ShopOrder.countDocuments({ createdAt, isOffPlatform: { $ne: true } }),
    channel && channel !== 'repas' ? 0 : MealOrder.countDocuments({ createdAt }),
    channel && channel !== 'platform'
      ? 0
      : Commande.countDocuments({ createdAt, statut: { $ne: 'annulee' } }),
  ]);

  return { shop, repas, platform, total: shop + repas + platform };
}

/** Admin overview — Meta Ads style funnel + conversions. */
router.get('/overview', auth, isRestaurant, async (req, res) => {
  try {
    const from = String(req.query.from || todayKeyBenin()).trim();
    const to = String(req.query.to || from).trim();
    const channel = String(req.query.channel || 'all').trim().toLowerCase();
    const pathQ = String(req.query.path || req.query.url || '').trim();

    const createdAt = buildDateFilter(from, to);
    if (!createdAt) {
      return res.status(400).json({ message: 'Dates invalides (YYYY-MM-DD)' });
    }

    const match = { createdAt, ...pathMatchFilter(pathQ) };
    if (VALID_CHANNELS.has(channel)) match.channel = channel;

    const [
      byEvent,
      byChannel,
      topPages,
      topCtas,
      topProducts,
      daily,
      utmSources,
      utmCampaigns,
      sessionsAgg,
      orderCounts,
    ] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: '$event', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { createdAt, ...(pathQ ? pathMatchFilter(pathQ) : {}) } },
        {
          $group: {
            _id: { channel: '$channel', event: '$event' },
            count: { $sum: 1 },
            value: { $sum: '$value' },
          },
        },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, event: 'page_view' } },
        {
          $group: {
            _id: '$path',
            views: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
          },
        },
        {
          $project: {
            path: '$_id',
            views: 1,
            sessions: { $size: '$sessions' },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 25 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, event: 'cta_click' } },
        {
          $group: {
            _id: {
              label: { $ifNull: ['$ctaLabel', '(sans label)'] },
              path: '$path',
              channel: '$channel',
            },
            clicks: { $sum: 1 },
          },
        },
        {
          $project: {
            label: '$_id.label',
            path: '$_id.path',
            channel: '$_id.channel',
            clicks: 1,
          },
        },
        { $sort: { clicks: -1 } },
        { $limit: 25 },
      ]),
      AnalyticsEvent.aggregate([
        {
          $match: {
            ...match,
            event: { $in: ['product_view', 'product_click'] },
          },
        },
        {
          $group: {
            _id: {
              id: '$productId',
              name: '$productName',
              slug: '$productSlug',
              channel: '$channel',
              event: '$event',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              id: '$_id.id',
              name: '$_id.name',
              slug: '$_id.slug',
              channel: '$_id.channel',
            },
            views: {
              $sum: { $cond: [{ $eq: ['$_id.event', 'product_view'] }, '$count', 0] },
            },
            clicks: {
              $sum: { $cond: [{ $eq: ['$_id.event', 'product_click'] }, '$count', 0] },
            },
          },
        },
        {
          $project: {
            productId: '$_id.id',
            name: '$_id.name',
            slug: '$_id.slug',
            channel: '$_id.channel',
            views: 1,
            clicks: 1,
          },
        },
        { $sort: { clicks: -1, views: -1 } },
        { $limit: 25 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ },
            },
            pageViews: {
              $sum: { $cond: [{ $eq: ['$event', 'page_view'] }, 1, 0] },
            },
            ctaClicks: {
              $sum: { $cond: [{ $eq: ['$event', 'cta_click'] }, 1, 0] },
            },
            purchases: {
              $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
            },
            productClicks: {
              $sum: { $cond: [{ $eq: ['$event', 'product_click'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, utmSource: { $ne: '' } } },
        {
          $group: {
            _id: '$utmSource',
            events: { $sum: 1 },
            purchases: {
              $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
            },
          },
        },
        { $sort: { events: -1 } },
        { $limit: 15 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, utmCampaign: { $ne: '' } } },
        {
          $group: {
            _id: '$utmCampaign',
            events: { $sum: 1 },
            purchases: {
              $sum: { $cond: [{ $eq: ['$event', 'purchase'] }, 1, 0] },
            },
          },
        },
        { $sort: { events: -1 } },
        { $limit: 15 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, sessionId: { $ne: '' } } },
        { $group: { _id: '$sessionId' } },
        { $count: 'sessions' },
      ]),
      countOrdersInRange(from, to, VALID_CHANNELS.has(channel) ? channel : null),
    ]);

    const eventMap = Object.fromEntries(byEvent.map((r) => [r._id, r]));
    const pageViews = eventMap.page_view?.count || 0;
    const ctaClicks = eventMap.cta_click?.count || 0;
    const productViews = eventMap.product_view?.count || 0;
    const productClicks = eventMap.product_click?.count || 0;
    const addToCart = eventMap.add_to_cart?.count || 0;
    const beginCheckout = eventMap.begin_checkout?.count || 0;
    const purchasesTracked = eventMap.purchase?.count || 0;
    const leads = eventMap.lead?.count || 0;
    const registrations = eventMap.complete_registration?.count || 0;
    const purchaseValue = eventMap.purchase?.value || 0;
    const sessions = sessionsAgg[0]?.sessions || 0;

    const channelFunnel = {};
    for (const ch of ['shop', 'repas', 'platform', 'recrutement', 'other']) {
      channelFunnel[ch] = {
        pageViews: 0,
        ctaClicks: 0,
        productClicks: 0,
        beginCheckout: 0,
        purchases: 0,
        purchaseValue: 0,
      };
    }
    for (const row of byChannel) {
      const ch = row._id.channel || 'other';
      const ev = row._id.event;
      if (!channelFunnel[ch]) continue;
      if (ev === 'page_view') channelFunnel[ch].pageViews += row.count;
      if (ev === 'cta_click') channelFunnel[ch].ctaClicks += row.count;
      if (ev === 'product_click') channelFunnel[ch].productClicks += row.count;
      if (ev === 'begin_checkout') channelFunnel[ch].beginCheckout += row.count;
      if (ev === 'purchase') {
        channelFunnel[ch].purchases += row.count;
        channelFunnel[ch].purchaseValue += row.value || 0;
      }
    }

    // Merge real order counts as “commandes finalisées” (source of truth)
    if (!VALID_CHANNELS.has(channel) || channel === 'shop') {
      channelFunnel.shop.orders = orderCounts.shop;
    }
    if (!VALID_CHANNELS.has(channel) || channel === 'repas') {
      channelFunnel.repas.orders = orderCounts.repas;
    }
    if (!VALID_CHANNELS.has(channel) || channel === 'platform') {
      channelFunnel.platform.orders = orderCounts.platform;
    }

    const conversions = {};
    for (const [ch, f] of Object.entries(channelFunnel)) {
      const orders = f.orders ?? f.purchases;
      conversions[ch] = {
        ...f,
        orders: orders || 0,
        viewToCta: pct(f.ctaClicks, f.pageViews),
        viewToPurchase: pct(orders || f.purchases, f.pageViews),
        ctaToPurchase: pct(orders || f.purchases, f.ctaClicks),
        checkoutToPurchase: pct(orders || f.purchases, f.beginCheckout),
      };
    }

    const thankYouViews = await AnalyticsEvent.countDocuments({
      ...match,
      event: 'purchase',
    });

    res.json({
      from,
      to,
      channel: VALID_CHANNELS.has(channel) ? channel : 'all',
      path: normalizePathInput(pathQ) || null,
      kpis: {
        sessions,
        pageViews,
        ctaClicks,
        productViews,
        productClicks,
        addToCart,
        beginCheckout,
        purchasesTracked,
        thankYouViews,
        orders: orderCounts.total,
        ordersByChannel: {
          shop: orderCounts.shop,
          repas: orderCounts.repas,
          platform: orderCounts.platform,
        },
        purchaseValue,
        leads,
        registrations,
        conversionRate: pct(orderCounts.total, pageViews),
        ctaRate: pct(ctaClicks, pageViews),
        purchaseRate: pct(purchasesTracked, pageViews),
      },
      funnel: {
        pageViews,
        productClicks,
        ctaClicks,
        addToCart,
        beginCheckout,
        thankYouViews: purchasesTracked,
        orders: orderCounts.total,
      },
      conversions,
      topPages,
      topCtas,
      topProducts,
      daily: daily.map((d) => ({
        date: d._id,
        pageViews: d.pageViews,
        ctaClicks: d.ctaClicks,
        productClicks: d.productClicks,
        purchases: d.purchases,
      })),
      utmSources: utmSources.map((u) => ({
        source: u._id,
        events: u.events,
        purchases: u.purchases,
        conversionRate: pct(u.purchases, u.events),
      })),
      utmCampaigns: utmCampaigns.map((u) => ({
        campaign: u._id,
        events: u.events,
        purchases: u.purchases,
        conversionRate: pct(u.purchases, u.events),
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Detailed breakdown for one URL/path. */
router.get('/path', auth, isRestaurant, async (req, res) => {
  try {
    const from = String(req.query.from || todayKeyBenin()).trim();
    const to = String(req.query.to || from).trim();
    const pathQ = String(req.query.path || req.query.url || '').trim();
    if (!pathQ) return res.status(400).json({ message: 'URL ou chemin requis' });

    const createdAt = buildDateFilter(from, to);
    if (!createdAt) return res.status(400).json({ message: 'Dates invalides' });

    const match = { createdAt, ...pathMatchFilter(pathQ) };

    const [byEvent, recent, sessionsAgg] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: '$event', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      AnalyticsEvent.find(match).sort({ createdAt: -1 }).limit(50).lean(),
      AnalyticsEvent.aggregate([
        { $match: { ...match, sessionId: { $ne: '' } } },
        { $group: { _id: '$sessionId' } },
        { $count: 'sessions' },
      ]),
    ]);

    const eventMap = Object.fromEntries(byEvent.map((r) => [r._id, { count: r.count, value: r.value }]));
    const pageViews = eventMap.page_view?.count || 0;
    const ctaClicks = eventMap.cta_click?.count || 0;
    const purchases = eventMap.purchase?.count || 0;

    res.json({
      path: normalizePathInput(pathQ),
      from,
      to,
      sessions: sessionsAgg[0]?.sessions || 0,
      events: eventMap,
      kpis: {
        pageViews,
        ctaClicks,
        purchases,
        conversionRate: pct(purchases, pageViews),
        ctaRate: pct(ctaClicks, pageViews),
      },
      recent: recent.map((e) => ({
        id: e._id,
        event: e.event,
        channel: e.channel,
        path: e.path,
        ctaLabel: e.ctaLabel,
        productName: e.productName,
        orderId: e.orderId,
        utmSource: e.utmSource,
        utmCampaign: e.utmCampaign,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
