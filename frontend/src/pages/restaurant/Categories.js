import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './Categories.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

const Categories = () => {
  const { logout } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [categories, setCategories] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({ nom: '', ordre: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
      setCategories([]);
      setProduits([]);
      setLoading(false);
      return;
    }
    fetchData();
  }, [currentRestaurantId]);

  const fetchData = async () => {
    if (!currentRestaurantId) return;
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        axios.get(`${API_URL}/categories-produit?restaurantId=${currentRestaurantId}`),
        axios.get(`${API_URL}/produits?restaurantId=${currentRestaurantId}`)
      ]);
      setCategories(catRes.data || []);
      setProduits(prodRes.data || []);
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
      if (formData.ordre !== '') data.append('ordre', formData.ordre);
      if (imageFile) data.append('image', imageFile);
      data.append('restaurantId', currentRestaurantId);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingCat) {
        await axios.put(`${API_URL}/categories-produit/${editingCat._id}`, data, config);
      } else {
        await axios.post(`${API_URL}/categories-produit`, data, config);
      }
      setShowForm(false);
      setEditingCat(null);
      setFormData({ nom: '', ordre: '' });
      setImageFile(null);
      setImagePreview(null);
      await fetchData();
      alert(editingCat ? 'Catégorie modifiée.' : 'Catégorie créée.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setFormData({ nom: cat.nom, ordre: cat.ordre != null ? cat.ordre : '' });
    setImagePreview(cat.image ? `${BASE_URL}${cat.image}` : null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ? Les produits restent mais sans cette catégorie.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/categories-produit/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      alert('Catégorie supprimée.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const countByCategory = (catId) => produits.filter(p => (p.categorieProduit && p.categorieProduit._id) === catId).length;

  if (loading) return <PageLoader message="Chargement des catégories..." />;

  return (
    <div className="categories-page">
      <DashboardSidebar onLogout={logout} />
      <div className="categories-content">
        <div className="categories-header">
          <h1>Catégories produits</h1>
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
          <p style={{ color: '#666', marginTop: '4px' }}>Catégories propres à l'entreprise sélectionnée (ex: T-shirts, Électronique).</p>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingCat(null); setFormData({ nom: '', ordre: '' }); setImageFile(null); setImagePreview(null); }} disabled={!currentRestaurantId}>
            + Ajouter une catégorie
          </button>
        </div>

        <div className="categories-list">
          {categories.map((cat) => (
            <div key={cat._id} className="category-card category-card-admin">
              {cat.image ? (
                <img src={`${BASE_URL}${cat.image}`} alt={cat.nom} className="category-icon-img" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span className="category-icon">📦</span>
              )}
              <span className="category-name">{cat.nom}</span>
              <span className="category-count">{countByCategory(cat._id)} produit(s)</span>
              <div className="plat-actions" style={{ marginLeft: 'auto' }}>
                <button className="btn btn-secondary btn-small" onClick={() => handleEdit(cat)}>Modifier</button>
                <button className="btn btn-outline btn-small" onClick={() => handleDelete(cat._id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingCat(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie produit'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Ordre</label>
                  <input type="number" value={formData.ordre} onChange={(e) => setFormData({ ...formData, ordre: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label>Image</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingCat(null); }}>Annuler</button>
                  <button type="submit" className="btn btn-primary">{editingCat ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
