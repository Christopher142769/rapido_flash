import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './PromosDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function PromoUsersDashboard() {
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [firstCount, setFirstCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadOffers = async () => {
    const res = await axios.get(`${API_URL}/promos/offers`, authHeaders);
    const list = Array.isArray(res.data) ? res.data : [];
    setOffers(list);
    if (!selectedOfferId && list.length > 0) setSelectedOfferId(String(list[0]._id));
  };

  const loadUsers = async (q = '') => {
    const encoded = encodeURIComponent(q);
    const res = await axios.get(`${API_URL}/promos/users?q=${encoded}`, authHeaders);
    setUsers(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    loadOffers().catch(() => {});
    loadUsers().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUser = (id) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const generateCodes = async (mode) => {
    if (!selectedOfferId) return;
    setLoading(true);
    setMessage('');
    try {
      const payload =
        mode === 'manual'
          ? { mode, userIds: selectedUsers }
          : mode === 'first_new_users'
            ? { mode, firstCount }
            : { mode };
      const res = await axios.post(`${API_URL}/promos/offers/${selectedOfferId}/generate-codes`, payload, authHeaders);
      const count = res?.data?.createdCount || 0;
      setMessage(`${count} code(s) généré(s) avec succès.`);
      if (mode === 'manual') setSelectedUsers([]);
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="promos-page">
      <div className="promos-card">
        <h2>Utilisateurs & attribution codes promo</h2>
        <p>Attribue des codes aux nouveaux inscrits, à tous les utilisateurs ou à une sélection manuelle.</p>
        <div className="promos-grid">
          <div>
            <label>Offre</label>
            <select className="promos-select" value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)}>
              {offers.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.title} ({o.discountPercent}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Recherche utilisateur</label>
            <input
              className="promos-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, email, téléphone"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  loadUsers(search).catch(() => {});
                }
              }}
            />
          </div>
        </div>
        <div className="promos-row" style={{ marginTop: 10 }}>
          <button type="button" className="promos-button secondary" style={{ width: 'auto' }} onClick={() => loadUsers(search).catch(() => {})}>
            Rechercher
          </button>
          <button type="button" className="promos-button" style={{ width: 'auto' }} onClick={() => generateCodes('all_users')} disabled={loading || !selectedOfferId}>
            Générer pour tous les utilisateurs
          </button>
          <button type="button" className="promos-button" style={{ width: 'auto' }} onClick={() => generateCodes('new_users')} disabled={loading || !selectedOfferId}>
            Générer pour nouveaux inscrits (30 jours)
          </button>
        </div>
        <div className="promos-row" style={{ marginTop: 10, alignItems: 'center' }}>
          <input
            className="promos-input"
            type="number"
            min="1"
            value={firstCount}
            onChange={(e) => setFirstCount(Number(e.target.value))}
            style={{ maxWidth: 180 }}
          />
          <button type="button" className="promos-button" style={{ width: 'auto' }} onClick={() => generateCodes('first_new_users')} disabled={loading || !selectedOfferId}>
            Générer pour les premiers inscrits
          </button>
        </div>
      </div>

      <div className="promos-card">
        <h3>Sélection manuelle</h3>
        <p>Sélection: {selectedUsers.length} utilisateur(s)</p>
        <div className="promos-users-list">
          {users.map((u) => (
            <label key={u._id} className="promos-user-item">
              <input type="checkbox" checked={selectedUsers.includes(String(u._id))} onChange={() => toggleUser(String(u._id))} />
              <div>
                <strong>{u.nom}</strong>
                <div>{u.email}</div>
                <small>{new Date(u.createdAt).toLocaleString()} - {u.role}</small>
              </div>
              <span className="promos-pill">{u.telephone || '—'}</span>
            </label>
          ))}
          {users.length === 0 ? <div style={{ padding: 12 }}>Aucun utilisateur.</div> : null}
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="promos-button"
            onClick={() => generateCodes('manual')}
            disabled={loading || !selectedOfferId || selectedUsers.length === 0}
          >
            Générer des codes pour la sélection
          </button>
        </div>
        {message ? <p style={{ marginTop: 10 }}>{message}</p> : null}
      </div>
    </div>
  );
}
