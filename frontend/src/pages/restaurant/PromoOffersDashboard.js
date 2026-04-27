import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './PromosDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function PromoOffersDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [publicCode, setPublicCode] = useState('');
  const [scopeType, setScopeType] = useState('restaurant');
  const [productScope, setProductScope] = useState('all_products');
  const [audience, setAudience] = useState('all_users');
  const [newUsersWindowDays, setNewUsersWindowDays] = useState(30);
  const [firstNewUsersCount, setFirstNewUsersCount] = useState(100);
  const [validUntil, setValidUntil] = useState('');
  const [productIds, setProductIds] = useState([]);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadRestaurants = async () => {
    const res = await axios.get(`${API_URL}/restaurants/my/restaurants`, authHeaders);
    const list = Array.isArray(res.data) ? res.data : [];
    setRestaurants(list);
    if (!restaurantId && list.length > 0) setRestaurantId(String(list[0]._id));
  };

  const loadOffers = async (rid) => {
    if (!rid) return;
    const res = await axios.get(`${API_URL}/promos/offers?restaurantId=${rid}`, authHeaders);
    setOffers(Array.isArray(res.data) ? res.data : []);
  };

  const loadProducts = async (rid) => {
    if (!rid) return;
    const res = await axios.get(`${API_URL}/produits/dashboard/${rid}`, authHeaders);
    setProducts(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    loadRestaurants().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    loadOffers(restaurantId).catch(() => {});
    loadProducts(restaurantId).catch(() => {});
    setProductIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const createOffer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/promos/offers`,
        {
          restaurantId,
          title,
          description,
          discountPercent,
          publicCode,
          scopeType,
          productScope,
          audience,
          newUsersWindowDays,
          firstNewUsersCount,
          validUntil: validUntil || null,
          productIds: productScope === 'selected_products' ? productIds : [],
        },
        authHeaders
      );
      setTitle('');
      setDescription('');
      setDiscountPercent(10);
      setPublicCode('');
      setScopeType('restaurant');
      setProductScope('all_products');
      setAudience('all_users');
      setNewUsersWindowDays(30);
      setFirstNewUsersCount(100);
      setValidUntil('');
      setProductIds([]);
      await loadOffers(restaurantId);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferStatus = async (offer) => {
    const next = offer.status === 'active' ? 'cancelled' : 'active';
    await axios.patch(`${API_URL}/promos/offers/${offer._id}/status`, { status: next }, authHeaders);
    await loadOffers(restaurantId);
  };

  const toggleProduct = (id) => {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="promos-page">
      <div className="promos-card">
        <h2>Offres promotionnelles</h2>
        <p>Crée des réductions avec code promo, période de validité et produits ciblés.</p>
        <div className="promos-grid">
          <div>
            <label>Entreprise</label>
            <select className="promos-select" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
              {restaurants.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <form className="promos-card" onSubmit={createOffer}>
        <h3>Créer une offre</h3>
        <div className="promos-grid">
          <input className="promos-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de l'offre" required />
          <input
            className="promos-input"
            type="number"
            min="1"
            max="90"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            placeholder="% réduction"
            required
          />
          <input
            className="promos-input"
            value={publicCode}
            onChange={(e) => setPublicCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="Code promo (ex: FLASH10)"
            required
          />
          <select className="promos-select" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
            <option value="restaurant">Portée: entreprise choisie</option>
            <option value="platform">Portée: toute la plateforme</option>
          </select>
          <input className="promos-input" type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="promos-grid" style={{ marginTop: 10 }}>
          <select className="promos-select" value={productScope} onChange={(e) => setProductScope(e.target.value)}>
            <option value="all_products">Tous les produits de la portée</option>
            <option value="selected_products">Seulement produits sélectionnés</option>
          </select>
          <select className="promos-select" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="all_users">Tous les utilisateurs</option>
            <option value="new_users">Nouveaux inscrits</option>
            <option value="first_new_users">Premiers inscrits</option>
          </select>
          <input
            className="promos-input"
            type="number"
            min="1"
            value={newUsersWindowDays}
            onChange={(e) => setNewUsersWindowDays(Number(e.target.value))}
            placeholder="Fenêtre nouveaux inscrits (jours)"
            disabled={audience !== 'new_users'}
          />
          <input
            className="promos-input"
            type="number"
            min="1"
            value={firstNewUsersCount}
            onChange={(e) => setFirstNewUsersCount(Number(e.target.value))}
            placeholder="Nombre premiers inscrits"
            disabled={audience !== 'first_new_users'}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <input
            className="promos-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'offre (optionnel)"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <strong>Produits ciblés (laisser vide = tous les produits)</strong>
          <div className="promos-row" style={{ marginTop: 8 }}>
            {productScope === 'selected_products' && scopeType === 'restaurant' ? products.map((p) => (
              <button
                key={p._id}
                type="button"
                className={`promos-button secondary ${productIds.includes(String(p._id)) ? '' : ''}`}
                style={{ width: 'auto', padding: '6px 10px', background: productIds.includes(String(p._id)) ? '#8b4513' : '#fff', color: productIds.includes(String(p._id)) ? '#fff' : '#8b4513' }}
                onClick={() => toggleProduct(String(p._id))}
              >
                {p.nom}
              </button>
            )) : <span className="promos-pill">Mode tous produits actif</span>}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="promos-button" type="submit" disabled={loading || !restaurantId}>
            {loading ? 'Création...' : "Créer l'offre"}
          </button>
        </div>
      </form>

      <div className="promos-card">
        <h3>Offres existantes</h3>
        <div className="promos-offer-list">
          {offers.map((offer) => (
            <div key={offer._id} className="promos-offer-item">
              <div className="promos-row">
                <strong>{offer.title}</strong>
                <span className="promos-pill">{offer.discountPercent}%</span>
                {offer.publicCode ? <span className="promos-pill">Code: {offer.publicCode}</span> : null}
                <span className="promos-pill">{offer.status === 'active' ? 'Active' : 'Annulée'}</span>
                <span className="promos-pill">{offer.scopeType === 'platform' ? 'Plateforme' : 'Entreprise'}</span>
                <span className="promos-pill">
                  Audience: {offer.rules?.audience === 'new_users' ? 'Nouveaux' : offer.rules?.audience === 'first_new_users' ? 'Premiers' : 'Tous'}
                </span>
              </div>
              <div>
                {offer.productIds?.length ? `${offer.productIds.length} produit(s) ciblé(s)` : 'Tous les produits'}
              </div>
              <div>Valide jusqu&apos;à: {offer.validUntil ? new Date(offer.validUntil).toLocaleString() : 'Sans limite'}</div>
              <div className="promos-row">
                <button className="promos-button secondary" onClick={() => toggleOfferStatus(offer)} type="button" style={{ width: 'auto' }}>
                  {offer.status === 'active' ? 'Annuler' : 'Réactiver'}
                </button>
              </div>
            </div>
          ))}
          {offers.length === 0 ? <p>Aucune offre pour le moment.</p> : null}
        </div>
      </div>
    </div>
  );
}
