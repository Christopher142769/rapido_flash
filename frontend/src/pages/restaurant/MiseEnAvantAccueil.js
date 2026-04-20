import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import './MiseEnAvantAccueil.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

const MiseEnAvantAccueil = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState({ open: false, produitId: null, field: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/restaurants/my/restaurants`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const list = res.data || [];
        setRestaurants(list);
        const stored = localStorage.getItem(STORAGE_CURRENT_RESTAURANT);
        const id = stored && list.some((r) => r._id === stored) ? stored : list[0]?._id || '';
        setCurrentRestaurantIdState(id);
        if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
      })
      .catch(() => {});
  }, []);

  const setCurrentRestaurantId = (id) => {
    setCurrentRestaurantIdState(id || '');
    if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
  };

  const fetchProduits = async () => {
    if (!currentRestaurantId) {
      setProduits([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/produits/dashboard/${currentRestaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProduits(res.data || []);
    } catch (e) {
      console.error(e);
      setProduits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduits();
  }, [currentRestaurantId]);

  const updateLocalRow = (id, patch) => {
    setProduits((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  };

  const saveVisuels = async (produit, body) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`${API_URL}/produits/${produit._id}/visuels`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur enregistrement');
    }
  };

  const handleNomAfficheBlur = (p, value) => {
    const v = (value || '').trim();
    saveVisuels(p, { nomAfficheAccueil: v || null });
  };

  const onMediaPicked = (path) => {
    const { produitId, field } = picker;
    if (!produitId || !field) return;
    const p = produits.find((x) => x._id === produitId);
    if (!p) return;
    if (field === 'carte') {
      updateLocalRow(produitId, { imageCarteHome: path });
      saveVisuels(p, { imageCarteHome: path });
    } else if (field === 'banniere') {
      updateLocalRow(produitId, { banniereProduit: path });
      saveVisuels(p, { banniereProduit: path });
    }
    setPicker({ open: false, produitId: null, field: null });
  };

  const clearField = (p, field) => {
    if (field === 'carte') {
      updateLocalRow(p._id, { imageCarteHome: null });
      saveVisuels(p, { imageCarteHome: null });
    } else {
      updateLocalRow(p._id, { banniereProduit: null });
      saveVisuels(p, { banniereProduit: null });
    }
  };

  if (loading && !currentRestaurantId) return <PageLoader message="Chargement…" />;

  return (
    <div className="dashboard-page vitrine-page">
      <div className="dashboard-main">
        <div className="vitrine-content">
          <header className="vitrine-header">
            <h1>Vitrine accueil</h1>
            <p className="vitrine-intro">
              Pour chaque produit, définissez le <strong>nom affiché sur l’accueil</strong>, la{' '}
              <strong>photo carte</strong> (cartes sur la page d’accueil) et la{' '}
              <strong>bannière au clic</strong> (grande image à l’ouverture). Les images se choisissent dans la{' '}
              <strong>Galerie d’images</strong> (menu de gauche).
            </p>
          </header>

          {restaurants.length > 1 && (
            <div className="vitrine-restaurant-select">
              <label>Entreprise</label>
              <select
                value={currentRestaurantId || ''}
                onChange={(e) => setCurrentRestaurantId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <PageLoader message="Chargement des produits…" />
          ) : !currentRestaurantId ? (
            <p className="vitrine-empty">Sélectionnez une entreprise.</p>
          ) : produits.length === 0 ? (
            <p className="vitrine-empty">Aucun produit. Créez-en dans « Produits ».</p>
          ) : (
            <div className="vitrine-table-wrap">
              <table className="vitrine-table">
                <thead>
                  <tr>
                    <th>Nom produit (interne)</th>
                    <th>Nom sur l’accueil</th>
                    <th>Photo carte accueil</th>
                    <th>Bannière au clic</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((p) => (
                    <tr key={p._id}>
                      <td className="vitrine-nom">{p.nom}</td>
                      <td>
                        <input
                          type="text"
                          className="vitrine-input"
                          placeholder={p.nom}
                          defaultValue={p.nomAfficheAccueil || ''}
                          onBlur={(e) => handleNomAfficheBlur(p, e.target.value)}
                        />
                      </td>
                      <td>
                        <div className="vitrine-cell">
                          <div className="vitrine-thumb">
                            {p.imageCarteHome ? (
                              <img src={String(p.imageCarteHome).startsWith('http') ? p.imageCarteHome : `${BASE_URL}${p.imageCarteHome}`} alt="" />
                            ) : (
                              <span className="vitrine-ph">—</span>
                            )}
                          </div>
                          <div className="vitrine-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => setPicker({ open: true, produitId: p._id, field: 'carte' })}
                            >
                              Choisir
                            </button>
                            {p.imageCarteHome && (
                              <button type="button" className="btn btn-outline btn-small" onClick={() => clearField(p, 'carte')}>
                                Retirer
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="vitrine-cell">
                          <div className="vitrine-thumb">
                            {p.banniereProduit ? (
                              <img src={String(p.banniereProduit).startsWith('http') ? p.banniereProduit : `${BASE_URL}${p.banniereProduit}`} alt="" />
                            ) : (
                              <span className="vitrine-ph">—</span>
                            )}
                          </div>
                          <div className="vitrine-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => setPicker({ open: true, produitId: p._id, field: 'banniere' })}
                            >
                              Choisir
                            </button>
                            {p.banniereProduit && (
                              <button
                                type="button"
                                className="btn btn-outline btn-small"
                                onClick={() => clearField(p, 'banniere')}
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="vitrine-note">
            Les 4 premiers produits disponibles (par date de création) alimentent les cartes sur la page d’accueil.
          </p>
        </div>
      </div>

      <MediaPickerModal
        open={picker.open}
        onClose={() => setPicker({ open: false, produitId: null, field: null })}
        onSelect={onMediaPicked}
        title={picker.field === 'banniere' ? 'Bannière au clic sur le produit' : 'Photo carte accueil'}
      />
    </div>
  );
};

export default MiseEnAvantAccueil;
