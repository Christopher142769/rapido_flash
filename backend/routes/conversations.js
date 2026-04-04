const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Restaurant = require('../models/Restaurant');
const Produit = require('../models/Produit');
const { auth } = require('../middleware/auth');
const uploadChat = require('../middleware/uploadChat');
const { canManageMaintenance } = require('../utils/maintenanceAccess');
const { ensureAssistantUser } = require('../utils/ensurePlatformSupport');
const {
  sendAssistantWelcomeIfEmpty,
  sendAssistantTransferAndEscalate,
} = require('../utils/conversationAssistant');

let cachedAssistantUserId = null;
async function getAssistantUserId() {
  if (cachedAssistantUserId) return cachedAssistantUserId;
  const u = await ensureAssistantUser();
  cachedAssistantUserId = u._id;
  return cachedAssistantUserId;
}

const router = express.Router();
router.use(express.json({ limit: '10mb' }));

async function canManageRestaurant(userId, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return false;
  if (restaurant.proprietaire.toString() === userId.toString()) return true;
  return (restaurant.gestionnaires || []).some((g) => g.toString() === userId.toString());
}

async function loadConversationForUser(convId, user) {
  const c = await Conversation.findById(convId)
    .populate('restaurant', 'nom nomEn logo telephone')
    .populate('client', 'nom email telephone photo banned banReason');
  if (!c) return null;
  const rid = c.restaurant._id || c.restaurant;
  if (user.role === 'client' && String(c.client._id || c.client) !== String(user._id)) return null;
  if (user.role === 'client') return c;
  const ok = await canManageRestaurant(user._id, rid);
  if (ok) return c;
  if (canManageMaintenance(user)) return c;
  return null;
}

/** ID de la fiche « Service Rapido » (messagerie plateforme) */
router.get('/platform-support-restaurant', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const r = await Restaurant.findOne({ isPlatformSupport: true }).select('_id nom nomEn').lean();
    if (!r) return res.json({ restaurantId: null });
    res.json({ restaurantId: r._id, nom: r.nom, nomEn: r.nomEn });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Ouvrir ou récupérer la conversation client ↔ structure */
router.post('/open', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Réservé aux comptes clients' });
    }
    const { restaurantId, productId } = req.body;
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId requis' });
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Structure introuvable' });

    let conv = await Conversation.findOne({ restaurant: restaurantId, client: req.user._id });
    const isNew = !conv;
    if (!conv) {
      conv = await Conversation.create({
        restaurant: restaurantId,
        client: req.user._id,
        lastPreview: '',
        lastMessageAt: new Date(),
      });
    }

    const assistantId = await getAssistantUserId();
    await sendAssistantWelcomeIfEmpty(conv, assistantId);

    if (isNew && productId) {
      const p = await Produit.findById(productId);
      if (p && String(p.restaurant) === String(restaurantId)) {
        const label = p.nom || 'Produit';
        const intro = `📦 Demande concernant le produit : ${label}`;
        const msg = await Message.create({
          conversation: conv._id,
          sender: req.user._id,
          senderRole: 'client',
          body: intro,
          product: p._id,
        });
        conv.lastMessageAt = msg.createdAt;
        conv.lastPreview = intro;
        conv.unreadRestaurant = (conv.unreadRestaurant || 0) + 1;
        await conv.save();
      }
    }

    const populated = await Conversation.findById(conv._id)
      .populate('restaurant', 'nom nomEn logo telephone')
      .populate('client', 'nom email telephone photo banned banReason');
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Liste des conversations (client) */
router.get('/client', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const list = await Conversation.find({ client: req.user._id })
      .sort({ lastMessageAt: -1 })
      .populate('restaurant', 'nom nomEn logo')
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Liste des conversations pour une structure (dashboard) */
router.get('/restaurant/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const allowed = await canManageRestaurant(req.user._id, restaurantId);
    if (!allowed) return res.status(403).json({ message: 'Accès refusé' });
    const list = await Conversation.find({ restaurant: restaurantId })
      .sort({ lastMessageAt: -1 })
      .populate('client', 'nom email telephone photo banned banReason')
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Modération : toutes les conversations (emails PLATFORM_ADMIN_EMAIL / canManageMaintenance) */
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!canManageMaintenance(req.user)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const list = await Conversation.find()
      .sort({ lastMessageAt: -1 })
      .populate('restaurant', 'nom nomEn logo telephone')
      .populate('client', 'nom email telephone photo banned banReason')
      .limit(500)
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await loadConversationForUser(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });
    res.json(c);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const c = await loadConversationForUser(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const msgs = await Message.find({ conversation: c._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'nom nomEn prix imageCarteHome images')
      .populate('sender', 'nom photo role');
    res.json(msgs.reverse());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/:id/messages', auth, uploadChat.single('image'), async (req, res) => {
  try {
    const c = await loadConversationForUser(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });

    const body = (req.body.body || req.body.text || '').trim();
    const productId = req.body.productId || null;
    let imageUrl = '';
    if (req.file && req.file.path) imageUrl = req.file.path;

    if (!body && !imageUrl && !productId) {
      return res.status(400).json({ message: 'Message vide' });
    }

    let senderRole = 'client';
    if (req.user.role === 'restaurant' || req.user.role === 'gestionnaire') {
      const rid = c.restaurant._id || c.restaurant;
      const ok = await canManageRestaurant(req.user._id, rid);
      if (!ok) return res.status(403).json({ message: 'Accès refusé' });
      senderRole = 'restaurant';
    } else if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Accès refusé' });
    } else if (String(c.client._id || c.client) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    let productRef = null;
    if (productId) {
      const p = await Produit.findById(productId);
      const rid = c.restaurant._id || c.restaurant;
      if (p && String(p.restaurant) === String(rid)) productRef = p._id;
    }

    const preview = body || (imageUrl ? '📷 Photo' : '') || (productRef ? '📦 Produit' : '');
    const msg = await Message.create({
      conversation: c._id,
      sender: req.user._id,
      senderRole,
      body: body || '',
      imageUrl: imageUrl || '',
      product: productRef,
    });

    c.lastMessageAt = msg.createdAt;
    c.lastPreview = preview.slice(0, 200);
    if (senderRole === 'client') {
      c.unreadRestaurant = (c.unreadRestaurant || 0) + 1;
    } else {
      c.unreadClient = (c.unreadClient || 0) + 1;
    }
    await c.save();

    const isAutoProductIntro = /^📦 Demande concernant le produit/i.test(body || '');
    const hasClientIntent = (body || '').trim().length > 0 || !!imageUrl;
    if (senderRole === 'client' && c.awaitingUserIntent && hasClientIntent && !isAutoProductIntro) {
      const assistantId = await getAssistantUserId();
      await sendAssistantTransferAndEscalate(c, assistantId);
    }

    const populated = await Message.findById(msg._id)
      .populate('product', 'nom nomEn prix imageCarteHome images')
      .populate('sender', 'nom photo role');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Marquer comme lu côté client ou structure */
router.post('/:id/read', auth, async (req, res) => {
  try {
    const c = await loadConversationForUser(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });
    const side = req.body.side === 'restaurant' ? 'restaurant' : 'client';
    if (side === 'client' && req.user.role !== 'client') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (side === 'restaurant' && req.user.role === 'client') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (side === 'client') c.unreadClient = 0;
    else c.unreadRestaurant = 0;
    await c.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Accusé de lecture des alertes urgentes (structure ou plateforme) */
router.post('/:id/urgent/ack', auth, async (req, res) => {
  try {
    const c = await Conversation.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });
    const side = req.body.side === 'platform' ? 'platform' : 'restaurant';
    if (side === 'restaurant') {
      const rid = c.restaurant;
      const allowed = await canManageRestaurant(req.user._id, rid);
      if (!allowed) return res.status(403).json({ message: 'Accès refusé' });
      c.urgentSeenByRestaurantAt = new Date();
    } else {
      if (!canManageMaintenance(req.user)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      c.urgentSeenByPlatformAt = new Date();
    }
    await c.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Signalement fraude / litige (visible en modération) */
router.post('/:id/report', auth, async (req, res) => {
  try {
    const c = await loadConversationForUser(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable' });
    const { target, reason } = req.body;
    if (!['client', 'restaurant'].includes(target)) {
      return res.status(400).json({ message: 'target invalide' });
    }
    c.reports = c.reports || [];
    c.reports.push({
      by: req.user._id,
      target,
      reason: String(reason || '').slice(0, 2000),
      at: new Date(),
    });
    await c.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
