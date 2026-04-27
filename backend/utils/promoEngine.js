const PromoCode = require('../models/PromoCode');
const PromoOffer = require('../models/PromoOffer');
const User = require('../models/User');

function computeEligibleProductsSubtotal(produits = [], offer = null) {
  const restricted =
    String(offer?.productScope || 'all_products') === 'selected_products'
    && Array.isArray(offer?.productIds)
    && offer.productIds.length > 0;
  const allowedSet = restricted
    ? new Set(offer.productIds.map((id) => String(id)))
    : null;

  return (produits || []).reduce((sum, line) => {
    const productId = String(line?.produit || line?.produitId || '');
    if (!productId) return sum;
    if (allowedSet && !allowedSet.has(productId)) return sum;
    const qty = Number(line?.quantite || 0);
    const unit = Number(line?.prix || 0);
    if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty <= 0 || unit < 0) return sum;
    return sum + qty * unit;
  }, 0);
}

async function isUserEligibleForOffer({ userId, offer }) {
  const audience = String(offer?.rules?.audience || 'all_users');
  if (audience === 'all_users') return true;

  let user = null;
  if (offer && typeof offer === 'object' && offer._userForEligibility) {
    user = offer._userForEligibility;
  } else {
    user = await User.findById(userId).select('_id createdAt role').lean();
  }
  if (!user || user.role !== 'client') return false;

  if (audience === 'new_users') {
    const days = Math.max(1, Number(offer?.rules?.newUsersWindowDays || 30));
    const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return new Date(user.createdAt) >= minDate;
  }

  if (audience === 'first_new_users') {
    const limit = Math.max(1, Number(offer?.rules?.firstNewUsersCount || 1));
    const rank = await User.countDocuments({
      role: 'client',
      createdAt: { $lte: user.createdAt },
    });
    return rank <= limit;
  }

  // manual = réservé aux codes assignés individuellement.
  return false;
}

function isOfferCurrentlyValid(offer, now = new Date()) {
  if (!offer) return false;
  if (offer.status !== 'active') return false;
  if (offer.validFrom && new Date(offer.validFrom) > now) return false;
  if (offer.validUntil && new Date(offer.validUntil) < now) return false;
  return true;
}

function isCodeCurrentlyValid(codeDoc, now = new Date()) {
  if (!codeDoc) return false;
  if (codeDoc.status !== 'active') return false;
  if (codeDoc.expiresAt && new Date(codeDoc.expiresAt) < now) return false;
  if (Number(codeDoc.useCount || 0) >= Number(codeDoc.maxUses || 1)) return false;
  return true;
}

async function validatePromoCodeForOrder({
  code,
  userId,
  restaurantId,
  produits,
}) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) {
    return { ok: false, message: 'Code promo invalide.' };
  }

  const codeDoc = await PromoCode.findOne({
    code: normalized,
    restaurant: restaurantId,
  }).populate('offer');

  let offer = null;
  let appliedCode = normalized;
  let useTrackedByPromoCode = false;

  if (codeDoc) {
    if (!isCodeCurrentlyValid(codeDoc)) return { ok: false, message: 'Code promo expiré ou déjà utilisé.' };
    offer = codeDoc.offer;
    if (!isOfferCurrentlyValid(offer)) return { ok: false, message: 'Offre promo non disponible.' };
    if (codeDoc.assignedTo && String(codeDoc.assignedTo) !== String(userId)) {
      return { ok: false, message: 'Ce code promo est attribué à un autre utilisateur.' };
    }
    useTrackedByPromoCode = true;
  } else {
    offer = await PromoOffer.findOne({
      status: 'active',
      publicCode: normalized,
      $or: [
        { scopeType: 'platform' },
        { scopeType: { $exists: false }, restaurant: restaurantId }, // rétrocompatibilité
        { scopeType: 'restaurant', restaurant: restaurantId },
      ],
    }).lean();
    if (!offer || !isOfferCurrentlyValid(offer)) {
      const sameCodeOtherRestaurant = await PromoOffer.findOne({
        status: 'active',
        publicCode: normalized,
      })
        .populate('restaurant', 'nom')
        .lean();
      if (sameCodeOtherRestaurant && isOfferCurrentlyValid(sameCodeOtherRestaurant)) {
        return {
          ok: false,
          message: `Ce code promo est valable uniquement chez ${sameCodeOtherRestaurant.restaurant?.nom || 'une autre entreprise'}.`,
        };
      }
      return { ok: false, message: 'Code promo introuvable.' };
    }
    appliedCode = offer.publicCode || normalized;

    const eligibleUser = await isUserEligibleForOffer({ userId, offer });
    if (!eligibleUser) {
      return { ok: false, message: 'Vous n’êtes pas éligible à cette offre promo.' };
    }
  }

  const eligibleSubtotal = computeEligibleProductsSubtotal(produits, offer);
  if (eligibleSubtotal <= 0) {
    return { ok: false, message: 'Aucun produit du panier n’est éligible à ce code promo.' };
  }

  const pct = Math.min(90, Math.max(1, Math.round(Number(offer.discountPercent || 0))));
  const discountAmount = Math.round(eligibleSubtotal * (pct / 100));
  if (discountAmount <= 0) {
    return { ok: false, message: 'Montant de réduction invalide.' };
  }

  return {
    ok: true,
    codeDoc,
    offer,
    appliedCode,
    useTrackedByPromoCode,
    discountPercent: pct,
    eligibleSubtotal,
    discountAmount,
  };
}

module.exports = {
  computeEligibleProductsSubtotal,
  isOfferCurrentlyValid,
  isCodeCurrentlyValid,
  validatePromoCodeForOrder,
};
