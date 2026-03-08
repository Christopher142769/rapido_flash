const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido_flash', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connexion à MongoDB réussie');

    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@rapido.com' });
    if (existingAdmin) {
      console.log('⚠️  Un compte admin existe déjà avec cet email');
      process.exit(0);
    }

    // Créer le compte admin
    const admin = new User({
      nom: 'Administrateur',
      email: 'admin@rapido.com',
      password: 'admin123', // Le mot de passe sera hashé automatiquement
      role: 'restaurant', // Utiliser le rôle restaurant pour accéder au dashboard
      telephone: '+33123456789'
    });

    await admin.save();

    console.log('✅ Compte admin créé avec succès !');
    console.log('\n📧 Identifiants de connexion :');
    console.log('   Email: admin@rapido.com');
    console.log('   Mot de passe: admin123');
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte admin:', error);
    process.exit(1);
  }
};

createAdmin();
