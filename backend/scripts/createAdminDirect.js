const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido_flash';
    
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connecté');

    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@rapido.com' });
    if (existingAdmin) {
      console.log('\n⚠️  Un compte admin existe déjà !');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Nom:', existingAdmin.nom);
      console.log('🔑 Role:', existingAdmin.role);
      console.log('\n💡 Essayez de vous connecter avec:');
      console.log('   Email: admin@rapido.com');
      console.log('   Mot de passe: admin123');
      console.log('\n🔍 Si le mot de passe ne fonctionne pas, réinitialisons-le...');
      
      // Réinitialiser le mot de passe
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      console.log('✅ Mot de passe réinitialisé à "admin123"');
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Créer le compte admin
    console.log('\n🔄 Création du compte admin...');
    const admin = new User({
      nom: 'Administrateur',
      email: 'admin@rapido.com',
      password: 'admin123',
      role: 'restaurant',
      telephone: '+33123456789'
    });

    await admin.save();

    console.log('\n✅ Compte admin créé avec succès !');
    console.log('\n📧 Identifiants de connexion :');
    console.log('   Email: admin@rapido.com');
    console.log('   Mot de passe: admin123');
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion !');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('EPERM')) {
      console.error('\n💡 MongoDB n\'est pas accessible. Assurez-vous que MongoDB est en cours d\'exécution.');
      console.error('   Sur macOS: brew services start mongodb-community');
      console.error('   Ou vérifiez que MongoDB tourne sur le port 27017');
    }
    process.exit(1);
  }
};

createAdmin();
