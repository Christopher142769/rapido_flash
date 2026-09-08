const StaffSite = require('../models/StaffSite');

const DEFAULT_SITE_ID = 'gbegamey';

const BUILTIN_SITES = [
  { id: 'gbegamey', label: 'Gbegamey', sortOrder: 0 },
  { id: 'zogbo', label: 'Zogbo', sortOrder: 1 },
];

/** Cache mémoire (rafraîchi après mutations / périodiquement). */
let cache = {
  at: 0,
  sites: BUILTIN_SITES.map((s) => ({ ...s, active: true })),
  byId: Object.fromEntries(BUILTIN_SITES.map((s) => [s.id, { ...s, active: true }])),
};

const CACHE_TTL_MS = 30_000;

function normalizeSiteId(siteId) {
  return String(siteId || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isValidSiteIdFormat(siteId) {
  const id = normalizeSiteId(siteId);
  return /^[a-z0-9][a-z0-9-]{0,47}$/.test(id);
}

function slugifyLabel(label) {
  return normalizeSiteId(label);
}

async function ensureDefaultSites() {
  for (const spec of BUILTIN_SITES) {
    const existing = await StaffSite.findOne({ id: spec.id }).lean();
    if (!existing) {
      await StaffSite.create({ ...spec, active: true });
    }
  }
}

function applyCache(docs) {
  const sites = (docs || []).map((d) => ({
    id: d.id,
    label: d.label,
    active: d.active !== false,
    sortOrder: d.sortOrder ?? 0,
    notes: d.notes || '',
    _id: d._id,
  }));
  cache = {
    at: Date.now(),
    sites,
    byId: Object.fromEntries(sites.map((s) => [s.id, s])),
  };
  return cache;
}

async function refreshSitesCache({ force = false } = {}) {
  if (!force && cache.at && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache;
  }
  await ensureDefaultSites();
  const docs = await StaffSite.find({}).sort({ sortOrder: 1, label: 1 }).lean();
  return applyCache(docs);
}

async function listSites({ activeOnly = true } = {}) {
  await refreshSitesCache();
  const sites = cache.sites;
  return activeOnly ? sites.filter((s) => s.active) : sites;
}

/** Sync helpers for legacy imports (SITE_IDS / SITES). */
function getCachedSites({ activeOnly = true } = {}) {
  const sites = cache.sites || [];
  return activeOnly ? sites.filter((s) => s.active) : sites;
}

function getCachedSiteIds({ activeOnly = true } = {}) {
  return getCachedSites({ activeOnly }).map((s) => s.id);
}

/** @deprecated prefer listSites — sync snapshot for modules that still expect SITE_IDS */
const SITE_IDS = BUILTIN_SITES.map((s) => s.id);

const SITES = Object.fromEntries(BUILTIN_SITES.map((s) => [s.id, { id: s.id, label: s.label }]));

function isValidSiteId(siteId) {
  const id = normalizeSiteId(siteId);
  if (!id) return false;
  if (cache.byId[id]?.active) return true;
  // Fallback builtins before first refresh
  return BUILTIN_SITES.some((s) => s.id === id);
}

async function assertValidSiteId(siteId) {
  await refreshSitesCache();
  const id = normalizeSiteId(siteId);
  const site = cache.byId[id];
  if (!site || site.active === false) {
    const err = new Error('Site invalide');
    err.status = 400;
    throw err;
  }
  return id;
}

function siteLabel(siteId) {
  const id = normalizeSiteId(siteId);
  return cache.byId[id]?.label || SITES[id]?.label || id;
}

async function createSite({ id, label, notes = '', sortOrder } = {}) {
  const cleanLabel = String(label || '').trim();
  if (!cleanLabel) {
    const err = new Error('Nom du site requis');
    err.status = 400;
    throw err;
  }
  let siteId = normalizeSiteId(id || slugifyLabel(cleanLabel));
  if (!isValidSiteIdFormat(siteId)) {
    const err = new Error('Identifiant site invalide (a-z, 0-9, tirets)');
    err.status = 400;
    throw err;
  }
  const existing = await StaffSite.findOne({ id: siteId });
  if (existing) {
    const err = new Error('Ce site existe déjà');
    err.status = 409;
    throw err;
  }
  const maxOrder = await StaffSite.findOne({}).sort({ sortOrder: -1 }).select('sortOrder').lean();
  const doc = await StaffSite.create({
    id: siteId,
    label: cleanLabel,
    notes: String(notes || '').trim().slice(0, 500),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : (maxOrder?.sortOrder ?? 0) + 1,
    active: true,
  });
  await refreshSitesCache({ force: true });
  return doc.toObject();
}

async function updateSite(siteId, patch = {}) {
  const id = normalizeSiteId(siteId);
  const doc = await StaffSite.findOne({ id });
  if (!doc) {
    const err = new Error('Site introuvable');
    err.status = 404;
    throw err;
  }
  if (patch.label != null) {
    const cleanLabel = String(patch.label).trim();
    if (!cleanLabel) {
      const err = new Error('Nom du site requis');
      err.status = 400;
      throw err;
    }
    doc.label = cleanLabel;
  }
  if (patch.notes != null) doc.notes = String(patch.notes).trim().slice(0, 500);
  if (patch.active != null) doc.active = !!patch.active;
  if (patch.sortOrder != null && Number.isFinite(Number(patch.sortOrder))) {
    doc.sortOrder = Number(patch.sortOrder);
  }
  await doc.save();
  await refreshSitesCache({ force: true });
  return doc.toObject();
}

module.exports = {
  DEFAULT_SITE_ID,
  BUILTIN_SITES,
  SITES,
  SITE_IDS,
  normalizeSiteId,
  isValidSiteIdFormat,
  isValidSiteId,
  assertValidSiteId,
  siteLabel,
  ensureDefaultSites,
  refreshSitesCache,
  listSites,
  getCachedSites,
  getCachedSiteIds,
  createSite,
  updateSite,
  slugifyLabel,
};
