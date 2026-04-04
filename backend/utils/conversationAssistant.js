const Message = require('../models/Message');

const WELCOME_LINES_FR = [
  'Bonjour et bienvenue sur Rapido Flash !',
  'Je suis l’assistant de messagerie. Comment puis-je vous aider aujourd’hui ? Décrivez votre besoin en quelques mots : une équipe dédiée ou la boutique concernée prendra le relais très rapidement.',
];

const TRANSFER_FR =
  'Merci infiniment pour votre message. Avec toute notre courtoisie, nous transférons votre demande au service compétent. Vous recevrez une réponse dans les meilleurs délais — une alerte a été envoyée à la structure et à l’équipe Rapido Flash.';

/**
 * Premier contact : messages d’accueil si la conversation est vide.
 * N’incrémente pas unreadRestaurant.
 */
async function sendAssistantWelcomeIfEmpty(conv, assistantUserId) {
  const n = await Message.countDocuments({ conversation: conv._id });
  if (n > 0) return false;

  let lastAt = conv.lastMessageAt || new Date();
  for (const body of WELCOME_LINES_FR) {
    const msg = await Message.create({
      conversation: conv._id,
      sender: assistantUserId,
      senderRole: 'assistant',
      body,
    });
    lastAt = msg.createdAt;
  }

  conv.lastMessageAt = lastAt;
  conv.lastPreview = WELCOME_LINES_FR[WELCOME_LINES_FR.length - 1].slice(0, 200);
  conv.awaitingUserIntent = true;
  conv.unreadClient = (conv.unreadClient || 0) + WELCOME_LINES_FR.length;
  await conv.save();
  return true;
}

/**
 * Après la première réponse utile du client (en phase awaitingUserIntent).
 */
async function sendAssistantTransferAndEscalate(conv, assistantUserId) {
  const msg = await Message.create({
    conversation: conv._id,
    sender: assistantUserId,
    senderRole: 'assistant',
    body: TRANSFER_FR,
  });

  conv.awaitingUserIntent = false;
  conv.urgentEscalationAt = new Date();
  conv.urgentSeenByRestaurantAt = null;
  conv.urgentSeenByPlatformAt = null;
  conv.lastMessageAt = msg.createdAt;
  conv.lastPreview = TRANSFER_FR.slice(0, 200);
  conv.unreadClient = (conv.unreadClient || 0) + 1;
  await conv.save();
  return msg;
}

module.exports = {
  sendAssistantWelcomeIfEmpty,
  sendAssistantTransferAndEscalate,
  TRANSFER_FR,
};
