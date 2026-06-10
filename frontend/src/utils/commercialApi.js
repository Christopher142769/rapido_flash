import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export async function fetchCommercialOverview() {
  const res = await axios.get(`${API_URL}/commercial/overview`, authHeaders());
  return res.data;
}

export async function fetchCommercialOrders(params = {}) {
  const res = await axios.get(`${API_URL}/commercial/orders`, { ...authHeaders(), params });
  return res.data;
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
    relance: 'Relance',
    livree: 'Livré',
    annulee: 'Annulée',
  };
  return map[status] || status;
}

export function formatPrice(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}
