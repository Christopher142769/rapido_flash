/** Sites King Fish — présence personnel. */
const SITES = {
  gbegamey: { id: 'gbegamey', label: 'Gbegamey' },
  zogbo: { id: 'zogbo', label: 'Zogbo' },
};

const SITE_IDS = Object.keys(SITES);
const DEFAULT_SITE_ID = 'gbegamey';

function isValidSiteId(siteId) {
  return SITE_IDS.includes(String(siteId || '').trim().toLowerCase());
}

function siteLabel(siteId) {
  return SITES[siteId]?.label || siteId;
}

module.exports = {
  SITES,
  SITE_IDS,
  DEFAULT_SITE_ID,
  isValidSiteId,
  siteLabel,
};
