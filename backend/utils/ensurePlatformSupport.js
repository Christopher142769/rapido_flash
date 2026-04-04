const crypto = require('crypto');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const ASSISTANT_EMAIL = 'assistant@rapido-flash.internal';

/**
 * Utilisateur technique pour les messages senderRole "assistant" (populate nom).
 */
async function ensureAssistantUser() {
  let u = await User.findOne({ email: ASSISTANT_EMAIL });
  if (!u) {
    const password = crypto.randomBytes(24).toString('hex');
    u = new User({
      nom: 'Assistant Rapido',
      email: ASSISTANT_EMAIL,
      password,
      role: 'client',
    });
    await u.save();
    console.log('✅ Utilisateur assistant messagerie créé');
  }
  return u;
}

/**
 * Structure technique « Service Rapido » (non listée sur l’accueil, actif: false).
 */
async function ensurePlatformSupportRestaurant() {
  const existing = await Restaurant.findOne({ isPlatformSupport: true });
  if (existing) return existing;

  const admin =
    (await User.findOne({ email: 'admin@rapido.com' })) ||
    (await User.findOne({ role: 'restaurant' }).sort({ createdAt: 1 }));

  if (!admin) {
    console.warn('⚠️ Aucun admin / restaurant : impossible de créer la fiche support Rapido');
    return null;
  }

  const r = await Restaurant.create({
    nom: 'Rapido Flash — Service client',
    nomEn: 'Rapido Flash — Customer care',
    description: 'Équipe plateforme',
    proprietaire: admin._id,
    actif: false,
    isPlatformSupport: true,
    position: {
      latitude: 6.3725,
      longitude: 2.3544,
      adresse: 'Plateforme',
    },
    telephone: '',
    email: '',
  });
  console.log('✅ Fiche « Service Rapido » créée (messagerie plateforme)');
  return r;
}

async function ensurePlatformSupportStack() {
  await ensureAssistantUser();
  await ensurePlatformSupportRestaurant();
}

module.exports = {
  ensureAssistantUser,
  ensurePlatformSupportRestaurant,
  ensurePlatformSupportStack,
  ASSISTANT_EMAIL,
};
