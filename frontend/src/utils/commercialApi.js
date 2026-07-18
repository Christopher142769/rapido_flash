import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export async function fetchPointsProducts() {
  const res = await axios.get(`${API_URL}/commercial/points/products`, authHeaders());
  return res.data;
}

export async function fetchPointsSummary(params) {
  const res = await axios.get(`${API_URL}/commercial/points/summary`, {
    ...authHeaders(),
    params,
  });
  return res.data;
}

export async function fetchCommercialOverview() {
  const res = await axios.get(`${API_URL}/commercial/overview`, authHeaders());
  return res.data;
}

/** Liste Shop — même source que l’admin (GET /shop-orders). */
export async function fetchShopOrders(params = {}) {
  const res = await axios.get(`${API_URL}/shop-orders`, authHeaders());
  let orders = Array.isArray(res.data) ? res.data : [];
  const status = params.status;
  if (status === 'confirme') {
    orders = orders.filter((o) => resolveCommercialStatus(o) === 'confirme');
  } else if (status) {
    orders = orders.filter((o) => resolveCommercialStatus(o) === status);
  }
  return orders;
}

export async function fetchCommercialOrders(params = {}) {
  return fetchShopOrders(params);
}

export async function fetchCommercialBilan(params = {}) {
  const res = await axios.get(`${API_URL}/commercial/bilan`, { ...authHeaders(), params });
  return res.data;
}

export async function fetchTodayRelances() {
  const res = await axios.get(`${API_URL}/commercial/relances/today`, authHeaders());
  return res.data;
}

export async function confirmCommercialOrder(id) {
  const res = await axios.put(`${API_URL}/commercial/orders/${id}/confirm`, {}, authHeaders());
  return res.data;
}

export async function unconfirmCommercialOrder(id) {
  const res = await axios.put(`${API_URL}/commercial/orders/${id}/unconfirm`, {}, authHeaders());
  return res.data;
}

export async function deliverCommercialOrder(id) {
  const res = await axios.put(`${API_URL}/commercial/orders/${id}/deliver`, {}, authHeaders());
  return res.data;
}

export async function setOrderRelance(id, scheduledDeliveryAt) {
  const res = await axios.put(
    `${API_URL}/commercial/orders/${id}/relance`,
    { scheduledDeliveryAt },
    authHeaders()
  );
  return res.data;
}

export async function updateOrderSpecifications(id, clientSpecifications) {
  const res = await axios.put(
    `${API_URL}/commercial/orders/${id}/specifications`,
    { clientSpecifications },
    authHeaders()
  );
  return res.data;
}

/** Admin restaurant uniquement — modification champs commande Shop. */
export async function updateShopOrder(id, payload) {
  const res = await axios.patch(`${API_URL}/commercial/orders/${id}`, payload, authHeaders());
  return res.data;
}

/** Admin restaurant uniquement — suppression définitive. */
export async function deleteShopOrder(id) {
  const res = await axios.delete(`${API_URL}/commercial/orders/${id}`, authHeaders());
  return res.data;
}

export async function cancelCommercialOrder(id) {
  const res = await axios.put(`${API_URL}/commercial/orders/${id}/cancel`, {}, authHeaders());
  return res.data;
}

/** Flux opérationnel Shop (confirmée → préparation → livraison → livrée). */
export async function updateShopOrderStatut(id, statut) {
  const res = await axios.put(`${API_URL}/shop-orders/${id}/statut`, { statut }, authHeaders());
  return res.data;
}

/** Admin restaurant uniquement — modification commande repas. */
export async function updateMealOrder(id, payload) {
  const res = await axios.patch(`${API_URL}/meal-orders/${id}`, payload, authHeaders());
  return res.data;
}

/** Admin restaurant uniquement — suppression définitive commande repas. */
export async function deleteMealOrder(id) {
  const res = await axios.delete(`${API_URL}/meal-orders/${id}`, authHeaders());
  return res.data;
}

export async function createOffPlatformOrder(payload) {
  const res = await axios.post(`${API_URL}/commercial/bilan/off-platform`, payload, authHeaders());
  return res.data;
}

export async function fetchCommercialAccounts() {
  const res = await axios.get(`${API_URL}/commercial/accounts`, authHeaders());
  return res.data;
}

export async function createCommercialAccount(payload) {
  const res = await axios.post(`${API_URL}/commercial/accounts`, payload, authHeaders());
  return res.data;
}

export async function updateCommercialAccount(id, payload) {
  const res = await axios.patch(`${API_URL}/commercial/accounts/${id}`, payload, authHeaders());
  return res.data;
}

export async function triggerRelanceNotifications() {
  const res = await axios.post(`${API_URL}/commercial/relances/notify-today`, {}, authHeaders());
  return res.data;
}

export function formatCommercialStatus(status) {
  const map = {
    commande: 'Commande',
    confirme: 'Confirmé',
    relance: 'Relance',
    livree: 'Livré',
    annulee: 'Annulée',
  };
  return map[status] || status;
}

/** Statut commercial effectif (aligné sur commercialBilan.js). */
export function resolveCommercialStatus(order) {
  const s = order.commercialStatusResolved || order.commercialStatus;
  if (s === 'livree' || order.statut === 'livree') return 'livree';
  if (s === 'annulee' || order.statut === 'annulee') return 'annulee';
  if (
    s === 'confirme' ||
    order.confirmedAt ||
    order.statut === 'confirmee' ||
    order.statut === 'en_preparation' ||
    order.statut === 'en_livraison'
  ) {
    return 'confirme';
  }
  if (s === 'relance' || order.scheduledDeliveryAt) return 'relance';
  return s || 'commande';
}

export function formatPrice(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}
