import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function saveChampionDraftId(id) {
  if (id) localStorage.setItem('championDraftId', id);
}

export function getChampionDraftId() {
  return localStorage.getItem('championDraftId') || '';
}

export function clearChampionDraftId() {
  localStorage.removeItem('championDraftId');
}

export async function fetchChampionZones() {
  const res = await axios.get(`${API_URL}/champions/zones`);
  return res.data;
}

export async function onboardingStep1(formData) {
  const res = await axios.post(`${API_URL}/champions/onboarding/step1`, formData);
  return res.data;
}

export async function sendChampionOtp(championId, email) {
  const res = await axios.post(`${API_URL}/champions/onboarding/${championId}/otp/send`, { email });
  return res.data;
}

export async function verifyChampionOtp(championId, code, password) {
  const res = await axios.post(`${API_URL}/champions/onboarding/${championId}/otp/verify`, {
    code,
    password,
  });
  return res.data;
}

export async function updateChampionContacts(championId, data) {
  const res = await axios.put(`${API_URL}/champions/onboarding/${championId}/contacts`, data);
  return res.data;
}

export async function updateChampionIdDocument(championId, formData) {
  const res = await axios.put(`${API_URL}/champions/onboarding/${championId}/id-document`, formData);
  return res.data;
}

export async function updateChampionVehicle(championId, data) {
  const res = await axios.put(`${API_URL}/champions/onboarding/${championId}/vehicle`, data);
  return res.data;
}

export async function updateChampionPayment(championId, data) {
  const res = await axios.put(`${API_URL}/champions/onboarding/${championId}/payment`, data);
  return res.data;
}

export async function submitChampionApplication(championId) {
  const res = await axios.post(`${API_URL}/champions/onboarding/${championId}/submit`, {
    termsAccepted: true,
  });
  return res.data;
}

export async function fetchMyChampionProfile() {
  const res = await axios.get(`${API_URL}/champions/me`, authHeaders());
  return res.data;
}

export async function setChampionOnline(isOnline) {
  const res = await axios.put(`${API_URL}/champions/me/online`, { isOnline }, authHeaders());
  return res.data;
}

export async function updateChampionLocation(latitude, longitude) {
  const res = await axios.put(
    `${API_URL}/champions/me/location`,
    { latitude, longitude },
    authHeaders()
  );
  return res.data;
}

export async function updateChampionProfile(data) {
  const res = await axios.put(`${API_URL}/champions/me/profile`, data, authHeaders());
  return res.data;
}

export async function fetchAvailableMissions() {
  const res = await axios.get(`${API_URL}/champions/missions/available`, authHeaders());
  return res.data;
}

export async function fetchActiveMission() {
  const res = await axios.get(`${API_URL}/champions/missions/active`, authHeaders());
  return res.data;
}

export async function acceptMission(id) {
  const res = await axios.post(`${API_URL}/champions/missions/${id}/accept`, {}, authHeaders());
  return res.data;
}

export async function advanceMissionStep(id) {
  const res = await axios.put(`${API_URL}/champions/missions/${id}/step`, {}, authHeaders());
  return res.data;
}

export async function completeMission(id, { deliveryCode, proofPhoto }) {
  const fd = new FormData();
  if (deliveryCode) fd.append('deliveryCode', deliveryCode);
  if (proofPhoto) fd.append('proofPhoto', proofPhoto);
  const res = await axios.post(`${API_URL}/champions/missions/${id}/complete`, fd, {
    ...authHeaders(),
    headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function cancelMission(id, reason) {
  const res = await axios.post(`${API_URL}/champions/missions/${id}/cancel`, { reason }, authHeaders());
  return res.data;
}

export async function fetchMissionHistory() {
  const res = await axios.get(`${API_URL}/champions/missions/history`, authHeaders());
  return res.data;
}

export async function fetchChampionWallet() {
  const res = await axios.get(`${API_URL}/champions/wallet`, authHeaders());
  return res.data;
}

export async function withdrawChampionWallet(amount) {
  const res = await axios.post(`${API_URL}/champions/wallet/withdraw`, { amount }, authHeaders());
  return res.data;
}

export async function fetchChampionApplications(status = 'pending_validation') {
  const res = await axios.get(`${API_URL}/champions/admin/applications`, {
    ...authHeaders(),
    params: { status },
  });
  return res.data;
}

export async function fetchChampionAdminDetail(id) {
  const res = await axios.get(`${API_URL}/champions/admin/${id}`, authHeaders());
  return res.data;
}

export async function approveChampion(id) {
  const res = await axios.put(`${API_URL}/champions/admin/${id}/approve`, {}, authHeaders());
  return res.data;
}

export async function rejectChampion(id, reason) {
  const res = await axios.put(`${API_URL}/champions/admin/${id}/reject`, { reason }, authHeaders());
  return res.data;
}

export async function suspendChampion(id, reason) {
  const res = await axios.put(`${API_URL}/champions/admin/${id}/suspend`, { reason }, authHeaders());
  return res.data;
}

export async function reactivateChampion(id) {
  const res = await axios.put(`${API_URL}/champions/admin/${id}/reactivate`, {}, authHeaders());
  return res.data;
}

export async function releaseChampionPending(id) {
  const res = await axios.put(`${API_URL}/champions/admin/wallet/${id}/release-pending`, {}, authHeaders());
  return res.data;
}

export async function fetchMissionReviewInfo(missionId) {
  const res = await axios.get(`${API_URL}/champions/public/mission/${missionId}/review-info`);
  return res.data;
}

export async function submitChampionReview(payload) {
  const res = await axios.post(`${API_URL}/champions/public/review`, payload);
  return res.data;
}

export async function fetchMyChampionReviews() {
  const res = await axios.get(`${API_URL}/champions/me/reviews`, authHeaders());
  return res.data;
}

export const VEHICLE_LABELS = {
  moto: 'Moto',
  velo: 'Vélo',
  voiture: 'Voiture',
  pied: 'À pied',
};

export const MOMO_LABELS = { mtn: 'MTN MoMo', moov: 'Moov Money' };

export const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_validation: 'En attente de validation',
  active: 'Actif',
  rejected: 'Rejeté',
  suspended: 'Suspendu',
};

export const MISSION_STEP_BUTTONS = {
  accepted: 'Je vais récupérer la commande',
  heading_pickup: 'J’ai récupéré la commande',
  picked_up: 'Je suis en route vers le client',
  en_route: 'Je suis arrivé chez le client',
  arrived: 'Marquer comme livrée',
};

export function formatCfa(n) {
  return `CFA ${Math.round(Number(n) || 0).toLocaleString('fr-FR')}`;
}

export function whatsAppLink(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return `https://wa.me/${d}`;
}

export function telLink(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return `tel:+${d}`;
}
