const { signPayload } = require('./livreurSecurity');
const { publicAppBaseUrl } = require('./publicAppUrl');

const TYPES = { meal: 'Repas', shop: 'Shop poisson', commande: 'Commande plateforme' };
const TTL_MS = 120 * 24 * 3600 * 1000;

/** Lien contenu dans le QR remis au client (récapitulatif de commande). */
function orderQrUrl(type, id) {
  const token = signPayload({ t: 'ord', ty: type, id: String(id), e: Date.now() + TTL_MS });
  return `${publicAppBaseUrl()}/livreur/livraison/${token}`;
}

/** Ajoute `deliveryQr` à une commande sérialisée. */
function withDeliveryQr(doc, type) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  return { ...obj, deliveryQr: orderQrUrl(type, obj._id) };
}

const fullName = (c) => `${c?.firstName || ''} ${c?.lastName || ''}`.trim();

/** Récapitulatif normalisé d'une commande (réaffiché au livreur et envoyé par e-mail). */
async function loadOrderSummary(type, id) {
  if (type === 'meal') {
    const o = await require('../models/MealOrder').findById(id).lean();
    if (!o) return null;
    return {
      type, typeLabel: TYPES.meal, number: o.orderNumber || '', clientName: fullName(o.customer),
      clientPhone: o.customer?.phone || '', address: [o.customer?.city, o.customer?.addressDescription].filter(Boolean).join(' — '),
      items: (o.items || []).map((i) => `${i.productName} ×${i.quantity}`), total: o.totalPrice, deliveryFee: o.deliveryFee || 0,
    };
  }
  if (type === 'shop') {
    const o = await require('../models/ShopOrder').findById(id).lean();
    if (!o) return null;
    return {
      type, typeLabel: TYPES.shop, number: o.orderNumber || '', clientName: fullName(o.customer),
      clientPhone: o.customer?.phone || '', address: [o.customer?.city, o.customer?.addressDescription].filter(Boolean).join(' — '),
      items: [`${o.productName} ×${o.quantityLabel || o.quantity}`], total: o.totalPrice, deliveryFee: o.deliveryFee || 0,
    };
  }
  if (type === 'commande') {
    const o = await require('../models/Commande').findById(id)
      .populate('client', 'nom prenom telephone')
      .populate('restaurant', 'nom')
      .populate('plats.plat', 'nom')
      .populate('produits.produit', 'nom')
      .lean();
    if (!o) return null;
    const c = o.client || {};
    return {
      type, typeLabel: TYPES.commande, number: String(o._id).slice(-6).toUpperCase(),
      clientName: [c.prenom, c.nom].filter(Boolean).join(' ') || 'Client',
      clientPhone: o.adresseLivraison?.telephoneContact || c.telephone || '',
      address: [o.adresseLivraison?.adresse, o.adresseLivraison?.instruction].filter(Boolean).join(' — '),
      items: [
        ...(o.plats || []).map((p) => `${p.plat?.nom || 'Plat'} ×${p.quantite}`),
        ...(o.produits || []).map((p) => `${p.produit?.nom || 'Produit'} ×${p.quantite}`),
      ],
      total: o.total, deliveryFee: o.fraisLivraison || 0, restaurant: o.restaurant?.nom || '',
    };
  }
  return null;
}

module.exports = { orderQrUrl, withDeliveryQr, loadOrderSummary, TYPES };
