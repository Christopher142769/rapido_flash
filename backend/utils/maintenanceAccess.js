/** Qui peut activer / désactiver la maintenance globale */
function canManageMaintenance(user) {
  if (!user) return false;
  const raw = (process.env.PLATFORM_ADMIN_EMAIL || '').trim();
  const allowed = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0) {
    return allowed.includes(String(user.email || '').toLowerCase());
  }
  return user.role === 'restaurant' || user.role === 'gestionnaire';
}

module.exports = { canManageMaintenance };
