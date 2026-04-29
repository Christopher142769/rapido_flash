const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const LoginCode = require('../models/LoginCode');
const { auth } = require('../middleware/auth');
const { sendLoginCode, sendDashboardLoginCode } = require('../utils/mailer');
const { canManageMaintenance } = require('../utils/maintenanceAccess');
const { assignEligiblePromoCodesToUser } = require('../utils/promoAutoAssign');
const { sendToUserId } = require('../services/pushNotifications');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
// (car elle n'utilise pas Multer)
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key', {
    expiresIn: '30d'
  });
};

const generateLoginChallengeToken = (user) => {
  return jwt.sign(
    { id: String(user._id), email: String(user.email || '').toLowerCase(), type: 'login_2fa' },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '10m' }
  );
};

const requiresTwoFactorLogin = (user) => {
  const role = String(user?.role || '');
  return role === 'restaurant' || role === 'gestionnaire';
};

const beginTwoFactorLogin = async (user) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const emailNorm = String(user.email || '').toLowerCase().trim();
  await LoginCode.deleteMany({ email: emailNorm, purpose: 'login_2fa' });
  await LoginCode.create({
    email: emailNorm,
    user: user._id,
    code,
    purpose: 'login_2fa',
    expiresAt,
  });
  const emailResult = await sendDashboardLoginCode(user.email, code);
  if (!emailResult.sent) {
    return { ok: false, message: "Impossible d'envoyer le code de validation. Réessayez plus tard." };
  }
  return {
    ok: true,
    payload: {
      requiresTwoFactor: true,
      challengeToken: generateLoginChallengeToken(user),
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      }
    }
  };
};

// Inscription
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('nom').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, email, password, telephone, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = new User({
      nom,
      email,
      password,
      telephone,
      role: role || 'client'
    });

    await user.save();
    const assigned = await assignEligiblePromoCodesToUser(user);
    if (assigned.length > 0) {
      void sendToUserId(String(user._id), {
        title: 'Rapido — Nouveau code promo',
        body: `Vous avez ${assigned.length} nouveau(x) code(s) promo disponible(s).`,
        url: '/home',
        tag: `rapido-promo-${user._id}`,
      }).catch(() => {});
    }

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        canManageMaintenance: canManageMaintenance(user),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Connexion
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (user.banned) {
      return res.status(403).json({ message: 'Compte suspendu' });
    }

    if (!requiresTwoFactorLogin(user)) {
      return res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          banned: !!user.banned,
          canManageMaintenance: canManageMaintenance(user),
        }
      });
    }
    const login2FA = await beginTwoFactorLogin(user);
    if (!login2FA.ok) {
      return res.status(500).json({ message: login2FA.message });
    }
    return res.json(login2FA.payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/google', [
  body('credential').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Jeton Google invalide' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google OAuth non configuré (GOOGLE_CLIENT_ID manquant).' });
    }
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').toLowerCase().trim();
    const name = String(payload?.name || '').trim();
    const picture = String(payload?.picture || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'Email Google introuvable.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const generatedPassword = crypto.randomBytes(16).toString('hex');
      user = new User({
        nom: name || email.split('@')[0],
        email,
        password: generatedPassword,
        role: 'client',
        photo: picture || '',
      });
      await user.save();
      const assigned = await assignEligiblePromoCodesToUser(user);
      if (assigned.length > 0) {
        void sendToUserId(String(user._id), {
          title: 'Rapido — Nouveau code promo',
          body: `Vous avez ${assigned.length} nouveau(x) code(s) promo disponible(s).`,
          url: '/home',
          tag: `rapido-promo-${user._id}`,
        }).catch(() => {});
      }
    } else if (picture && !user.photo) {
      user.photo = picture;
      await user.save();
    }

    if (user.banned) {
      return res.status(403).json({ message: 'Compte suspendu' });
    }

    if (!requiresTwoFactorLogin(user)) {
      return res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          banned: !!user.banned,
          canManageMaintenance: canManageMaintenance(user),
        }
      });
    }
    const login2FA = await beginTwoFactorLogin(user);
    if (!login2FA.ok) {
      return res.status(500).json({ message: login2FA.message });
    }
    return res.json(login2FA.payload);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur Google Auth' });
  }
});

router.post('/verify-dashboard-2fa', [
  body('challengeToken').notEmpty(),
  body('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Code invalide' });
    }
    const { challengeToken, code } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(challengeToken, process.env.JWT_SECRET || 'secret_key');
    } catch (_) {
      return res.status(401).json({ message: 'Session 2FA expirée. Reconnectez-vous.' });
    }
    if (!decoded?.id || decoded?.type !== 'login_2fa') {
      return res.status(401).json({ message: 'Session 2FA invalide.' });
    }
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    const emailNorm = String(user.email || '').toLowerCase().trim();
    const record = await LoginCode.findOne({
      email: emailNorm,
      user: user._id,
      code: String(code || '').trim(),
      purpose: 'login_2fa',
    }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }
    await LoginCode.deleteMany({ email: emailNorm, purpose: 'login_2fa' });
    return res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        banned: !!user.banned,
        canManageMaintenance: canManageMaintenance(user),
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

// Envoyer un code de connexion par email (flux type Yelo)
router.post('/send-login-code', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Email invalide' });
    }
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'Aucun compte avec cet email' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await LoginCode.deleteMany({ email: email.toLowerCase().trim(), purpose: 'password_reset' });
    await LoginCode.create({ email: email.toLowerCase().trim(), code, expiresAt, purpose: 'password_reset' });
    const result = await sendLoginCode(email, code);
    if (!result.sent) {
      return res.status(500).json({ message: 'Impossible d\'envoyer l\'email. Réessayez plus tard.' });
    }
    res.json({ message: 'Code envoyé à votre adresse email' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

// Vérifier le code et définir un nouveau mot de passe puis connexion
router.post('/verify-login-code', [
  body('email').isEmail().normalizeEmail(),
  body('code').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Email, code et nouveau mot de passe (min. 6 caractères) requis' });
    }
    const { email, code, newPassword } = req.body;
    const emailNorm = email.toLowerCase().trim();
    const record = await LoginCode.findOne({ email: emailNorm, code, purpose: 'password_reset' }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    user.password = newPassword;
    await user.save();
    await LoginCode.deleteMany({ email: emailNorm, purpose: 'password_reset' });
    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        canManageMaintenance: canManageMaintenance(user),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

// Obtenir l'utilisateur actuel
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json({
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
        photo: user.photo,
        position: user.position,
        restaurantId: user.restaurantId,
        banned: !!user.banned,
        canManageMaintenance: canManageMaintenance(user),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour la position
router.put('/position', auth, async (req, res) => {
  try {
    const { latitude, longitude, adresse } = req.body;
    
    req.user.position = { latitude, longitude, adresse };
    await req.user.save();

    res.json({ message: 'Position mise à jour', position: req.user.position });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
