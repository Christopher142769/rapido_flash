import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export async function fetchKitchenAccounts() {
  const res = await axios.get(`${API_URL}/kitchen/accounts`, authHeaders());
  return res.data;
}

export async function createKitchenAccount(payload) {
  const res = await axios.post(`${API_URL}/kitchen/accounts`, payload, authHeaders());
  return res.data;
}

export async function updateKitchenAccount(id, payload) {
  const res = await axios.patch(`${API_URL}/kitchen/accounts/${id}`, payload, authHeaders());
  return res.data;
}

export async function fetchMealOrders(params = {}) {
  const res = await axios.get(`${API_URL}/meal-orders`, { ...authHeaders(), params });
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateMealOrderStatut(id, payload) {
  const res = await axios.put(`${API_URL}/meal-orders/${id}/statut`, payload, authHeaders());
  return res.data;
}

export function formatPrice(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}
