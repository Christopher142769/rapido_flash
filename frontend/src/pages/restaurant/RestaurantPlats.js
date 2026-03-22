import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './RestaurantPlats.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

const RestaurantPlats = () => {
  const { logout } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [produits, setProduits] = useState([]);
  const [categoriesProduit, setCategoriesProduit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix: '',
    categorieProduitId: '',
    disponible: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageCarteHomeFile, setImageCarteHomeFile] = useState(null);
  const [previewCarteHome, setPreviewCarteHome] = useState(null);
  const [banniereProduitFile, setBanniereProduitFile] = useState(null);
  const [previewBanniere, setPreviewBanniere] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`${API_URL}/restaurants/my/restaurants`, config).then((res) => {
      const list = res.data || [];
      setRestaurants(list);
      const stored = localStorage.getItem(STORAGE_CURRENT_RESTAURANT);
      const id = stored && list.some((r) => r._id === stored) ? stored : list[0]?._id || '';
      setCurrentRestaurantIdState(id);
      if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentRestaurantId) {
      setProduits([]);
      setCategoriesProduit([]);
      setLoading(false);
      return;
    }
    fetchData();
  }, [currentRestaurantId]);

  const fetchData = async () => {
    if (!currentRestaurantId) return;
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/produits?restaurantId=${currentRestaurantId}`),
        axios.get(`${API_URL}/categories-produit?restaurantId=${currentRestaurantId}`)
      ]);
      setProduits(prodRes.data || []);
      setCategoriesProduit(catRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentRestaurantId = (id) => {
    setCurrentRestaurantIdState(id || '');
    if (id) localStorage.setItem(STORAGE_CURRENT_RESTAURANT, id);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCarteHomeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageCarteHomeFile(file);
      setPreviewCarteHome(URL.createObjectURL(file));
    }
  };

  const handleBanniereChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBanniereProduitFile(file);
      setPreviewBanniere(URL.createObjectURL(file));
    }
  };

  const resetMediaPreviews = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageCarteHomeFile(null);
    setPreviewCarteHome(null);
    setBanniereProduitFile(null);
    setPreviewBanniere(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentRestaurantId) {
      alert('Sélectionnez une entreprise.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('nom', formData.nom.trim());
      data.append('description', (formData.description || '').trim());
      data.append('prix', String(formData.prix));
      if (formData.categorieProduitId) data.append('categorieProduitId', formData.categorieProduitId);
      data.append('disponible', formData.disponible);
      data.append('restaurantId', currentRestaurantId);
      if (imageFile) data.append('image', imageFile);
      if (imageCarteHomeFile) data.append('imageCarteHome', imageCarteHomeFile);
      if (banniereProduitFile) data.append('banniereProduit', banniereProduitFile);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingProduit) {
        await axios.put(`${API_URL}/produits/${editingProduit._id}`, data, config);
      } else {
        await axios.post(`${API_URL}/produits`, data, config);
      }
      setShowForm(false);
      setEditingProduit(null);
      setFormData({ nom: '', description: '', prix: '', categorieProduitId: '', disponible: true });
      resetMediaPreviews();
      await fetchData();
      alert(editingProduit ? 'Produit modifié.' : 'Produit créé.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (p) => {
    setEditingProduit(p);
    setFormData({
      nom: p.nom,
      description: p.description || '',
      prix: p.prix,
      categorieProduitId: (p.categorieProduit && p.categorieProduit._id) || '',
      disponible: p.disponible !== false
    });
    const firstImg = (p.images && p.images[0]) ? `${BASE_URL}${p.images[0]}` : null;
    setImagePreview(firstImg);
    setImageFile(null);
    setPreviewCarteHome(p.imageCarteHome ? `${BASE_URL}${p.imageCarteHome}` : null);
    setImageCarteHomeFile(null);
    setPreviewBanniere(p.banniereProduit ? `${BASE_URL}${p.banniereProduit}` : null);
    setBanniereProduitFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/produits/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      alert('Produit supprimé.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <PageLoader message="Chargement des produits..." />;

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="plats-content">
          <div className="plats-header">
            <h1>Gestion des produits</h1>
            {restaurants.length > 1 && (
              <div className="form-group" style={{ marginTop: '8px', marginBottom: '12px', maxWidth: '320px' }}>
                <label>Entreprise</label>
                <select
                  value={currentRestaurantId || ''}
                  onChange={(e) => setCurrentRestaurantId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }}
                >
                  <option value="">— Choisir —</option>
                  {restaurants.map((r) => (
                    <option key={r._id} value={r._id}>{r.nom}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {
              setShowForm(true);
              setEditingProduit(null);
              setFormData({ nom: '', description: '', prix: '', categorieProduitId: '', disponible: true });
              resetMediaPreviews();
            }} disabled={!currentRestaurantId}>
              + Ajouter un produit
            </button>
          </div>

          {showForm && (
            <div className="plat-form-modal">
              <div className="modal-content modal-content-produit-form">
                <h2>{editingProduit ? 'Modifier le produit' : 'Nouveau produit'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" />
                  </div>
                  <div className="form-group">
                    <label>Prix (FCFA) *</label>
                    <input type="number" min="0" step="1" value={formData.prix} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Catégorie produit</label>
                    <select value={formData.categorieProduitId || ''} onChange={(e) => setFormData({ ...formData, categorieProduitId: e.target.value })}>
                      <option value="">— Aucune —</option>
                      {categoriesProduit.map((c) => (
                        <option key={c._id} value={c._id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="produit-media-uploads">
                    <div className="form-group">
                      <label>
                        Image galerie (fiche produit, panier)
                        <span className="label-hint">Photo principale du produit ; plusieurs envois successifs ajoutent à la galerie à la modification.</span>
                      </label>
                      <div className="file-upload-container">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" id="produit-image-upload" />
                        <label htmlFor="produit-image-upload" className="file-upload-label">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Aperçu galerie" className="image-preview" />
                          ) : (
                            <div className="file-upload-placeholder">
                              <span>📷</span>
                              <span>Ajouter à la galerie</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>
                        Photo carte — page d’accueil
                        <span className="label-hint">Visuel large sur les cartes « produits » côté client (recommandé format paysage). Sinon la 1ʳᵉ image galerie est utilisée.</span>
                      </label>
                      <div className="file-upload-container">
                        <input type="file" accept="image/*" onChange={handleCarteHomeChange} className="file-input" id="produit-carte-home-upload" />
                        <label htmlFor="produit-carte-home-upload" className="file-upload-label">
                          {previewCarteHome ? (
                            <img src={previewCarteHome} alt="Aperçu carte accueil" className="image-preview" />
                          ) : (
                            <div className="file-upload-placeholder">
                              <span>🏠</span>
                              <span>Image pour l’accueil</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>
                        Bannière — clic sur le produit
                        <span className="label-hint">Grande image à l’ouverture (zoom) côté client. Sinon la galerie est affichée.</span>
                      </label>
                      <div className="file-upload-container">
                        <input type="file" accept="image/*" onChange={handleBanniereChange} className="file-input" id="produit-banniere-upload" />
                        <label htmlFor="produit-banniere-upload" className="file-upload-label">
                          {previewBanniere ? (
                            <img src={previewBanniere} alt="Aperçu bannière" className="image-preview" />
                          ) : (
                            <div className="file-upload-placeholder">
                              <span>🖼</span>
                              <span>Bannière détail</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" checked={formData.disponible} onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })} />
                      Disponible
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingProduit(null); resetMediaPreviews(); }}>Annuler</button>
                    <button type="submit" className="btn btn-primary">{editingProduit ? 'Modifier' : 'Créer'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="plats-grid">
            {produits.map((p) => {
              const imgSrc =
                (p.imageCarteHome && `${BASE_URL}${p.imageCarteHome}`) ||
                (p.images && p.images[0] && `${BASE_URL}${p.images[0]}`) ||
                getImageUrl(null, { nom: p.nom }, BASE_URL);
              return (
                <div key={p._id} className="plat-card-admin">
                  <img src={imgSrc} alt={p.nom} className="plat-image-admin" onError={(e) => { e.target.src = getImageUrl(null, { nom: p.nom }, BASE_URL); }} />
                  <div className="plat-info-admin">
                    <h3>{p.nom}</h3>
                    {p.description && <p>{p.description}</p>}
                    <div className="plat-details">
                      <span className="plat-prix-admin">{Number(p.prix).toFixed(0)} FCFA</span>
                      {p.categorieProduit && <span className="plat-categorie">{p.categorieProduit.nom}</span>}
                    </div>
                    <div className="plat-actions">
                      <button className="btn btn-secondary btn-small" onClick={() => handleEdit(p)}>Modifier</button>
                      <button className="btn btn-outline btn-small" onClick={() => handleDelete(p._id)}>Supprimer</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPlats;
