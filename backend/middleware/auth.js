const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Pas de token, accès refusé' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    if (req.user.banned) {
      return res.status(403).json({ message: 'Compte suspendu' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const isRestaurant = (req, res, next) => {
  if (req.user.role !== 'restaurant' && req.user.role !== 'gestionnaire') {
    return res.status(403).json({ message: 'Accès refusé - Restaurant requis' });
  }
  next();
};

const isCommercialStaff = (req, res, next) => {
  if (!['restaurant', 'gestionnaire', 'commercial', 'responsable'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé - Espace commercial requis' });
  }
  next();
};

const isRestaurantAdmin = (req, res, next) => {
  if (req.user.role !== 'restaurant') {
    return res.status(403).json({ message: 'Accès refusé - Administrateur requis' });
  }
  next();
};

const isLivreur = (req, res, next) => {
  if (req.user.role !== 'livreur') {
    return res.status(403).json({ message: 'Accès refusé - Espace Champion requis' });
  }
  next();
};

const isKitchenStaff = (req, res, next) => {
  if (!['restaurant', 'gestionnaire', 'commercial', 'cuisinier', 'responsable'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé - Espace cuisine requis' });
  }
  next();
};

const isCuisinier = (req, res, next) => {
  if (req.user.role !== 'cuisinier') {
    return res.status(403).json({ message: 'Accès refusé - Espace cuisinier requis' });
  }
  next();
};

module.exports = {
  auth,
  isRestaurant,
  isCommercialStaff,
  isRestaurantAdmin,
  isLivreur,
  isKitchenStaff,
  isCuisinier,
};
