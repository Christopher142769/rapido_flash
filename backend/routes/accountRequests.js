const express = require('express');
const { body, validationResult } = require('express-validator');
const AccountRequest = require('../models/AccountRequest');
const User = require('../models/User');
const LoginCode = require('../models/LoginCode');
const { auth } = require('../middleware/auth');
const { canManageMaintenance } = require('../utils/maintenanceAccess');

const router = express.Router();

router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: true, limit: '1mb' }));

function requireAdmin(req, res, next) {
  if (!canManageMaintenance(req.user)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  next();
}

/**
 * Création publique d'une demande (suppression de compte ou message support).
 * Pas d'authentification requise — c'est l'écran Play Store conforme.
 */
router.post(
  '/',
  [
    body('type').isIn(['deletion', 'support']),
    body('email').isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Type ou email invalide' });
      }
      const { type, email, nom, telephone, subject, message } = req.body || {};
      const emailNorm = String(email || '').toLowerCase().trim();
      if (type === 'support' && !String(message || '').trim()) {
        return res.status(400).json({ message: 'Veuillez décrire votre demande.' });
      }
      const existing = await User.findOne({ email: emailNorm });
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();
      const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 500);

      const doc = await AccountRequest.create({
        type,
        email: emailNorm,
        nom: String(nom || '').trim().slice(0, 200),
        telephone: String(telephone || '').trim().slice(0, 50),
        subject: String(subject || '').trim().slice(0, 200),
        message: String(message || '').trim().slice(0, 4000),
        user: existing ? existing._id : null,
        status: 'pending',
        ip: ip.slice(0, 100),
        userAgent,
      });
      return res.status(201).json({
        ok: true,
        message:
          type === 'deletion'
            ? 'Votre demande de suppression a bien été enregistrée. Notre équipe la traitera sous 7 jours et vous tiendra informé(e) par email.'
            : 'Votre message a bien été envoyé au service Rapido. Nous reviendrons vers vous par email.',
        id: doc._id,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Erreur serveur' });
    }
  }
);

/**
 * Listing admin avec filtres par type/status et pagination simple.
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { type, status, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (type && ['deletion', 'support'].includes(String(type))) filter.type = type;
    if (status && ['pending', 'in_progress', 'resolved', 'rejected'].includes(String(status))) filter.status = status;

    const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const skp = Math.max(0, parseInt(skip, 10) || 0);

    const [items, total, counts] = await Promise.all([
      AccountRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skp)
        .limit(lim)
        .populate('user', 'nom email role')
        .populate('processedBy', 'nom email')
        .lean(),
      AccountRequest.countDocuments(filter),
      AccountRequest.aggregate([
        { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({ items, total, counts });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

/**
 * Mise à jour admin : statut, note interne.
 */
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    const update = {};
    if (status && ['pending', 'in_progress', 'resolved', 'rejected'].includes(String(status))) {
      update.status = status;
      if (status === 'resolved' || status === 'rejected') {
        update.processedAt = new Date();
        update.processedBy = req.user._id;
      }
    }
    if (typeof adminNote === 'string') {
      update.adminNote = adminNote.slice(0, 4000);
    }
    const doc = await AccountRequest.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'nom email role')
      .populate('processedBy', 'nom email');
    if (!doc) return res.status(404).json({ message: 'Demande introuvable' });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

/**
 * Action admin : supprimer effectivement le compte associé à une demande de suppression.
 * Marque la demande comme résolue et accountDeleted=true.
 */
router.post('/:id/process-deletion', auth, requireAdmin, async (req, res) => {
  try {
    const reqDoc = await AccountRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Demande introuvable' });
    if (reqDoc.type !== 'deletion') {
      return res.status(400).json({ message: 'Cette demande n\'est pas une suppression de compte.' });
    }

    let deletedUserEmail = reqDoc.email;
    const user = reqDoc.user
      ? await User.findById(reqDoc.user)
      : await User.findOne({ email: reqDoc.email });

    if (user) {
      deletedUserEmail = String(user.email || reqDoc.email).toLowerCase().trim();
      await User.deleteOne({ _id: user._id });
      await LoginCode.deleteMany({ email: deletedUserEmail });
    }

    reqDoc.status = 'resolved';
    reqDoc.accountDeleted = true;
    reqDoc.processedAt = new Date();
    reqDoc.processedBy = req.user._id;
    if (!user) {
      reqDoc.adminNote = `${reqDoc.adminNote ? reqDoc.adminNote + '\n' : ''}[INFO] Aucun compte trouvé pour ${reqDoc.email} au moment du traitement.`.slice(0, 4000);
    }
    await reqDoc.save();

    return res.json({ ok: true, request: reqDoc, userDeleted: !!user });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

/**
 * Supprimer définitivement l'entrée (après traitement, nettoyage).
 */
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const doc = await AccountRequest.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Demande introuvable' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

module.exports = router;
