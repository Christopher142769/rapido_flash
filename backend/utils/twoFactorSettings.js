const AppSettings = require('../models/AppSettings');

const STAFF_2FA_ROLES = [
  'restaurant',
  'gestionnaire',
  'commercial',
  'cuisinier',
  'livreur',
  'responsable',
];

function defaultTwoFactorByRole() {
  return STAFF_2FA_ROLES.reduce((acc, role) => {
    acc[role] = true;
    return acc;
  }, {});
}

function normalizeTwoFactorByRole(raw = {}) {
  const out = defaultTwoFactorByRole();
  for (const role of STAFF_2FA_ROLES) {
    if (typeof raw[role] === 'boolean') out[role] = raw[role];
  }
  return out;
}

async function getTwoFactorByRole() {
  const doc = await AppSettings.findOne().select('twoFactorByRole').lean();
  return normalizeTwoFactorByRole(doc?.twoFactorByRole || {});
}

/** Clients : jamais. Autres rôles : selon AppSettings (défaut activé). */
async function roleRequiresTwoFactor(role) {
  const r = String(role || '');
  if (!r || r === 'client') return false;
  if (!STAFF_2FA_ROLES.includes(r)) return true;
  const map = await getTwoFactorByRole();
  return !!map[r];
}

module.exports = {
  STAFF_2FA_ROLES,
  defaultTwoFactorByRole,
  normalizeTwoFactorByRole,
  getTwoFactorByRole,
  roleRequiresTwoFactor,
};
