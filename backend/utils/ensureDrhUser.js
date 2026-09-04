const User = require('../models/User');

const DEFAULT_EMAIL = 'ressourcehumaine@rapido.bj';
const DEFAULT_PASSWORD = 'RhKingFish2026!';
const DEFAULT_NAME = 'DRH King Fish';

/**
 * Assure le compte DRH (ressources humaines) — accès uniquement présence personnel.
 * Mot de passe : DRH_PASSWORD (env) ou défaut affiché une fois à la création.
 */
async function ensureDrhUser() {
  const email = String(process.env.DRH_EMAIL || DEFAULT_EMAIL)
    .trim()
    .toLowerCase();
  const password = String(process.env.DRH_PASSWORD || DEFAULT_PASSWORD);
  const nom = String(process.env.DRH_NAME || DEFAULT_NAME).trim() || DEFAULT_NAME;

  let user = await User.findOne({ email });
  if (user) {
    let changed = false;
    if (user.role !== 'drh') {
      user.role = 'drh';
      changed = true;
    }
    if (user.banned) {
      user.banned = false;
      user.banReason = '';
      changed = true;
    }
    if (process.env.DRH_PASSWORD && process.env.DRH_RESET_PASSWORD === 'true') {
      user.password = password;
      changed = true;
    }
    if (changed) await user.save();
    console.log(`✅ Compte DRH prêt : ${email}`);
    return user;
  }

  user = new User({
    nom,
    email,
    password,
    role: 'drh',
    telephone: String(process.env.DRH_PHONE || '').trim() || undefined,
  });
  await user.save();

  console.log('✅ Compte DRH créé');
  console.log('📧 Identifiants ressources humaines :');
  console.log(`   Email: ${email}`);
  console.log(`   Mot de passe: ${password}`);
  console.log('⚠️  Espace dédié : /rh (présence personnel uniquement)');
  return user;
}

module.exports = ensureDrhUser;
module.exports.DEFAULT_EMAIL = DEFAULT_EMAIL;
module.exports.DEFAULT_PASSWORD = DEFAULT_PASSWORD;
