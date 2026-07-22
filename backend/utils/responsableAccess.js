const RESPONSABLE_CITIES = ['Cotonou', 'Calavi'];

function isResponsable(user) {
  return user?.role === 'responsable';
}

function getAssignedCity(user) {
  const city = String(user?.assignedCity || '').trim();
  return RESPONSABLE_CITIES.includes(city) ? city : '';
}

/** Début de journée fuseau Bénin (commandes « à partir d’aujourd’hui »). */
function startOfTodayBenin(now = new Date()) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(now);
  // Bénin = UTC+1 toute l’année
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

function responsableListFilter(user) {
  if (!isResponsable(user)) return {};
  const city = getAssignedCity(user);
  const filter = {
    createdAt: { $gte: startOfTodayBenin() },
  };
  if (city) filter['customer.city'] = city;
  return filter;
}

module.exports = {
  RESPONSABLE_CITIES,
  isResponsable,
  getAssignedCity,
  startOfTodayBenin,
  assertResponsableCityAccess,
  responsableListFilter,
};
