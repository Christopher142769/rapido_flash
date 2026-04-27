const PromoOffer = require('../models/PromoOffer');
const PromoCode = require('../models/PromoCode');

function normalizeCodePart(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function randomCodeSuffix(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueCode(basePrefix = 'RAPIDO') {
  const prefix = normalizeCodePart(basePrefix) || 'RAPIDO';
  for (let i = 0; i < 20; i += 1) {
    const code = `${prefix}-${randomCodeSuffix(6)}`;
    const existing = await PromoCode.findOne({ code }).select('_id').lean();
    if (!existing) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

async function qualifiesFirstNewUsersRule(user, firstCount) {
  const limit = Math.max(1, Number(firstCount || 0));
  if (!Number.isFinite(limit) || limit <= 0) return false;
  const rank = await user.constructor.countDocuments({
    role: 'client',
    createdAt: { $lte: user.createdAt },
  });
  return rank <= limit;
}

async function assignEligiblePromoCodesToUser(user) {
  if (!user || user.role !== 'client') return [];

  const now = new Date();
  const offers = await PromoOffer.find({
    status: 'active',
    $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
  })
    .select('_id title restaurant validUntil rules')
    .lean();

  const createdCodes = [];
  for (const offer of offers) {
    const audience = String(offer?.rules?.audience || 'manual');
    if (!['all_users', 'new_users', 'first_new_users'].includes(audience)) continue;

    let eligible = false;
    if (audience === 'all_users') eligible = true;
    if (audience === 'new_users') eligible = true;
    if (audience === 'first_new_users') {
      // eslint-disable-next-line no-await-in-loop
      eligible = await qualifiesFirstNewUsersRule(user, offer?.rules?.firstNewUsersCount);
    }
    if (!eligible) continue;

    // eslint-disable-next-line no-await-in-loop
    const exists = await PromoCode.findOne({ offer: offer._id, assignedTo: user._id }).select('_id').lean();
    if (exists) continue;

    // eslint-disable-next-line no-await-in-loop
    const code = await generateUniqueCode(offer.title || 'PROMO');
    createdCodes.push({
      offer: offer._id,
      restaurant: offer.restaurant,
      code,
      assignedTo: user._id,
      assignmentType: audience,
      maxUses: 1,
      expiresAt: offer.validUntil || null,
    });
  }

  if (createdCodes.length === 0) return [];
  return PromoCode.insertMany(createdCodes, { ordered: false });
}

module.exports = { assignEligiblePromoCodesToUser };
