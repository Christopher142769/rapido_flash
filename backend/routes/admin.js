const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Endpoint pour créer/réinitialiser le compte admin
router.post('/create-admin', async (req, res) => {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@rapido.com' });
    
    if (existingAdmin) {
      // Réinitialiser le mot de passe du compte existant
      existingAdmin.password = 'admin123';
      existingAdmin.role = 'restaurant';
      existingAdmin.nom = 'Administrateur';
      await existingAdmin.save();
      
      return res.json({
        success: true,
        message: 'Compte admin existant - Mot de passe réinitialisé !',
        credentials: {
          email: 'admin@rapido.com',
          password: 'admin123'
        },
        reset: true
      });
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

    res.json({
      success: true,
      message: 'Compte admin créé avec succès !',
      credentials: {
        email: 'admin@rapido.com',
        password: 'admin123'
      },
      created: true
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création/réinitialisation du compte admin',
      error: error.message 
    });
  }
});

module.exports = router;
