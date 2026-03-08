const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const uploadUser = require('../middleware/uploadUser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Obtenir tous les utilisateurs (admin)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir un utilisateur par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour les informations personnelles de l'utilisateur connecté
router.put('/me', auth, async (req, res) => {
  try {
    const { nom, email, telephone } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour les champs
    if (nom) user.nom = nom.trim();
    if (email) user.email = email.trim();
    if (telephone !== undefined) user.telephone = telephone ? telephone.trim() : '';

    await user.save();

    res.json({
      message: 'Informations mises à jour avec succès',
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        photo: user.photo,
        position: user.position,
        restaurantId: user.restaurantId
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des informations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour la photo de profil de l'utilisateur connecté
router.put('/photo', auth, uploadUser.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Supprimer l'ancienne photo si elle existe
    if (user.photo) {
      const oldPhotoPath = path.join(__dirname, '..', user.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Mettre à jour la photo
    user.photo = `/uploads/users/photos/${req.file.filename}`;
    await user.save();

    res.json({ 
      message: 'Photo mise à jour avec succès',
      photo: user.photo
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la photo:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
