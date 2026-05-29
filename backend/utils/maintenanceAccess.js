/** Adresses admin plateforme (PLATFORM_ADMIN_EMAIL, séparées par des virgules). */
function getPlatformAdminEmails() {
  const raw = (process.env.PLATFORM_ADMIN_EMAIL || '').trim();
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Qui peut activer / désactiver la maintenance globale */
function canManageMaintenance(user) {
  if (!user) return false;
  const allowed = getPlatformAdminEmails().map((e) => e.toLowerCase());
  if (allowed.length > 0) {
    return allowed.includes(String(user.email || '').toLowerCase());
  }
  return user.role === 'restaurant' || user.role === 'gestionnaire';
}

module.exports = { canManageMaintenance, getPlatformAdminEmails };
