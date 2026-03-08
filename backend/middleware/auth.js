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

module.exports = { auth, isRestaurant };
