const User = require('../models/User');

/**
 * Initialise un compte administrateur par défaut si aucun admin n'existe
 */
const initDefaultAdmin = async () => {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'admin@rapido.com' },
        { role: 'restaurant', email: { $exists: true } }
      ]
    });

    if (existingAdmin) {
      console.log('✅ Compte admin déjà existant');
      return;
    }

    // Créer le compte admin par défaut
    const admin = new User({
      nom: 'Administrateur',
      email: 'admin@rapido.com',
      password: 'admin123', // Le mot de passe sera hashé automatiquement par le pre-save hook
      role: 'restaurant', // Utiliser le rôle restaurant pour accéder au dashboard
      telephone: '+22900000000'
    });

    await admin.save();

    console.log('✅ Compte admin créé par défaut !');
    console.log('📧 Identifiants de connexion :');
    console.log('   Email: admin@rapido.com');
    console.log('   Mot de passe: admin123');
    console.log('⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte admin par défaut:', error);
    // Ne pas bloquer le démarrage du serveur si l'admin ne peut pas être créé
  }
};

module.exports = initDefaultAdmin;
