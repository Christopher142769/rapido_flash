/**
 * Prix / promo / accompagnements Shop Repas.
 * Réutilise getShopPromoState (même shape promo que Shop Express).
 */
const { getShopPromoState } = require('./shopPromo');

function normalizeAccompagnements(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => ({
      name: String(a?.name || '').trim(),
      price: Math.max(0, Math.round(Number(a?.price) || 0)),
      required: !!a?.required,
      maxQuantity: Math.min(99, Math.max(1, Number(a?.maxQuantity) || 10)),
      _id: a?._id ? String(a._id) : undefined,
    }))
    .filter((a) => a.name);
}

function normalizeOptionGroups(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((g) => ({
      name: String(g?.name || '').trim(),
      selectionType: g?.selectionType === 'multiple' ? 'multiple' : 'single',
      required: !!g?.required,
      choices: (Array.isArray(g?.choices) ? g.choices : [])
        .map((c) => ({
          label: String(c?.label || '').trim(),
          price: Math.max(0, Math.round(Number(c?.price) || 0)),
          _id: c?._id ? String(c._id) : undefined,
        }))
        .filter((c) => c.label),
      _id: g?._id ? String(g._id) : undefined,
    }))
    .filter((g) => g.name && g.choices.length);
}

/**
 * Valide les options choisies et calcule le supplément par plat.
 * @returns {{ error?: string, options?: Array, perUnitTotal?: number }}
 */
function resolveMealOptions(product, line) {
  const groups = product.optionGroups || [];
  if (!groups.length) return { options: [], perUnitTotal: 0 };

  const selected = Array.isArray(line?.options) ? line.options : [];
  const resultOptions = [];
  let perUnitTotal = 0;

  for (const group of groups) {
    const groupId = String(group._id || '');
    const picks = selected.filter(
      (s) =>
        (s.groupId && String(s.groupId) === groupId) ||
        String(s.groupName || '').trim().toLowerCase() === String(group.name).trim().toLowerCase()
    );

    if (group.selectionType === 'single' && picks.length > 1) {
      return { error: `Un seul choix autorisé pour « ${group.name} »` };
    }
    if (group.required && picks.length < 1) {
      return { error: `Choix requis : ${group.name}` };
    }

    for (const pick of picks) {
      const choice = (group.choices || []).find(
        (c) =>
          (pick.choiceId && String(c._id) === String(pick.choiceId)) ||
          String(c.label || '').trim().toLowerCase() ===
            String(pick.choiceLabel || '').trim().toLowerCase()
      );
      if (!choice) {
        return { error: `Option inconnue pour « ${group.name} »` };
      }
      const price = Math.max(0, Math.round(Number(choice.price) || 0));
      resultOptions.push({
        groupId,
        groupName: group.name,
        choiceId: String(choice._id || ''),
        choiceLabel: choice.label,
        price,
      });
      perUnitTotal += price;
    }
  }

  return { options: resultOptions, perUnitTotal };
}

function getMealUnitPrice(product, now = new Date()) {
  const promoState = getShopPromoState(product, now);
  return {
    promoState,
    unitPrice: promoState.isPromoLive ? promoState.promoPrice : promoState.basePrice,
  };
}

/**
 * Valide et calcule une ligne panier côté serveur.
 * @param {object} product MealProduct doc
 * @param {{ quantity: number, accompagnements?: { id?: string, name?: string, quantity: number }[] }} line
 */
function buildMealOrderLine(product, line) {
  const quantity = Math.max(1, Math.round(Number(line?.quantity) || 0));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: 'Quantité invalide' };
  }

  const { promoState, unitPrice } = getMealUnitPrice(product);
  const catalog = product.accompagnements || [];
  const selected = Array.isArray(line?.accompagnements) ? line.accompagnements : [];

  const requiredOnes = catalog.filter((a) => a.required);
  for (const req of requiredOnes) {
    const pick = selected.find(
      (s) =>
        (s.id && String(s.id) === String(req._id)) ||
        String(s.name || '').trim().toLowerCase() === String(req.name).trim().toLowerCase()
    );
    const qty = Math.round(Number(pick?.quantity) || 0);
    if (qty < 1) {
      return { error: `Accompagnement requis : ${req.name}` };
    }
  }

  const accompagnements = [];
  let accTotal = 0;

  for (const s of selected) {
    const qty = Math.round(Number(s.quantity) || 0);
    if (qty < 1) continue;
    const match = catalog.find(
      (a) =>
        (s.id && String(s.id) === String(a._id)) ||
        String(s.name || '').trim().toLowerCase() === String(a.name).trim().toLowerCase()
    );
    if (!match) {
      return { error: `Accompagnement inconnu : ${s.name || s.id}` };
    }
    const maxQ = Math.min(99, Math.max(1, Number(match.maxQuantity) || 10));
    const safeQty = Math.min(maxQ, qty);
    const price = Math.max(0, Math.round(Number(match.price) || 0));
    accompagnements.push({
      accompagnementId: String(match._id || ''),
      name: match.name,
      price,
      quantity: safeQty,
    });
    accTotal += price * safeQty;
  }

  if (catalog.length > 0 && accompagnements.length === 0) {
    return { error: 'Choisissez au moins un accompagnement pour ce plat' };
  }

  const optionResult = resolveMealOptions(product, line);
  if (optionResult.error) return { error: optionResult.error };
  const options = optionResult.options || [];
  const optionsPerUnit = optionResult.perUnitTotal || 0;

  const specifications = String(line?.specifications || '').trim().slice(0, 500);

  const lineTotal = Math.round(unitPrice * quantity + optionsPerUnit * quantity + accTotal);

  return {
    item: {
      mealProduct: product._id,
      productName: product.name,
      slug: product.slug,
      quantity,
      unitPrice,
      basePrice: promoState.basePrice,
      isPromoLive: promoState.isPromoLive,
      discountPercent: promoState.discountPercent,
      accompagnements,
      options,
      specifications,
      lineTotal,
    },
    promoState,
  };
}

function computeMealOrderTotals(items, deliveryFee, freeDelivery = false) {
  const subtotalPrice = items.reduce((sum, it) => sum + Math.round(Number(it.lineTotal) || 0), 0);
  const fee = freeDelivery ? 0 : Math.max(0, Math.round(Number(deliveryFee) || 0));
  return {
    subtotalPrice,
    deliveryFee: fee,
    totalPrice: subtotalPrice + fee,
  };
}

function serializeMealProduct(product) {
  const doc = product.toObject ? product.toObject() : { ...product };
  const promoState = getShopPromoState(doc);
  return {
    ...doc,
    ...promoState,
    accompagnements: normalizeAccompagnements(doc.accompagnements),
    optionGroups: normalizeOptionGroups(doc.optionGroups),
    allowSpecifications: doc.allowSpecifications !== false,
  };
}

module.exports = {
  normalizeAccompagnements,
  normalizeOptionGroups,
  getMealUnitPrice,
  buildMealOrderLine,
  computeMealOrderTotals,
  serializeMealProduct,
};
