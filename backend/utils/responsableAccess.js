const RESPONSABLE_CITIES = ['Cotonou', 'Calavi'];

function isResponsable(user) {
  return user?.role === 'responsable';
}

function isCommercial(user) {
  return user?.role === 'commercial';
}

function getAssignedCity(user) {
  const city = String(user?.assignedCity || '').trim();
  return RESPONSABLE_CITIES.includes(city) ? city : '';
}

function getAssignedProductIds(user) {
  const raw = user?.assignedShopProducts || [];
  return raw
    .map((p) => String(p?._id || p || '').trim())
    .filter(Boolean);
}

/** Début de journée fuseau Bénin. */
function startOfTodayBenin(now = new Date()) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(now);
  return new Date(`${key}T00:00:00+01:00`);
}

function assertResponsableCityAccess(user, order) {
  if (!isResponsable(user)) return null;
  const city = getAssignedCity(user);
  if (!city) return 'Ville non assignée à ce compte';
  const orderCity = String(order?.customer?.city || '').trim();
  if (orderCity !== city) {
    return 'Accès refusé — commande hors de votre ville';
  }
  return null;
}

function assertStaffShopProductAccess(user, order) {
  if (!isResponsable(user) && !isCommercial(user)) return null;
  const ids = getAssignedProductIds(user);
  if (isResponsable(user) && !ids.length) {
    return 'Aucun produit Shop assigné à ce compte';
  }
  if (!ids.length) return null; // commercial sans liste = tous les produits
  const pid = String(order?.shopProduct?._id || order?.shopProduct || '').trim();
  if (!pid || !ids.includes(pid)) {
    return 'Accès refusé — produit non assigné';
  }
  return null;
}

function assertStaffShopOrderAccess(user, order) {
  const cityErr = assertResponsableCityAccess(user, order);
  if (cityErr) return cityErr;
  return assertStaffShopProductAccess(user, order);
}

/**
 * Filtre Mongo des commandes Shop visibles.
 * - responsable : ville + produits assignés (obligatoires)
 * - commercial : produits assignés si la liste n’est pas vide, sinon tout
 */
function staffShopListFilter(user) {
  if (isResponsable(user)) {
    const city = getAssignedCity(user);
    const products = getAssignedProductIds(user);
    const filter = {};
    if (city) filter['customer.city'] = city;
    if (products.length) {
      filter.shopProduct = { $in: products };
    } else {
      filter._id = { $in: [] };
    }
    return filter;
  }
  if (isCommercial(user)) {
    const products = getAssignedProductIds(user);
    if (products.length) return { shopProduct: { $in: products } };
    return {};
  }
  return {};
}

/** Filtre repas pour responsable (ville seulement — pas de produits Shop). */
function responsableMealListFilter(user) {
  if (!isResponsable(user)) return {};
  const city = getAssignedCity(user);
  const filter = {};
  if (city) filter['customer.city'] = city;
  return filter;
}

/** @deprecated alias Shop — préférer staffShopListFilter */
function responsableListFilter(user) {
  return staffShopListFilter(user);
}

function normalizeAssignedShopProductIds(raw) {
  if (!Array.isArray(raw)) return null;
  const ids = [...new Set(raw.map((p) => String(p?._id || p || '').trim()).filter(Boolean))];
  return ids;
}

module.exports = {
  RESPONSABLE_CITIES,
  isResponsable,
  isCommercial,
  getAssignedCity,
  getAssignedProductIds,
  startOfTodayBenin,
  assertResponsableCityAccess,
  assertStaffShopProductAccess,
  assertStaffShopOrderAccess,
  staffShopListFilter,
  responsableMealListFilter,
  responsableListFilter,
  normalizeAssignedShopProductIds,
};
