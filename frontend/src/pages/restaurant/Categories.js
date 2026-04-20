import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LanguageContext from '../../context/LanguageContext';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import { DashboardEditIconButton, DashboardDeleteIconButton } from '../../components/ui/DashboardIconButtons';
import './Categories.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const STORAGE_CURRENT_RESTAURANT = 'dashboardCurrentRestaurantId';

const Categories = () => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState('');
  const [categories, setCategories] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [formData, setFormData] = useState({ nom: '', nomEn: '', ordre: '' });
  const [imagePreview, setImagePreview] = useState(null);
  /** undefined = ne pas envoyer imagePath ; '' = retirer l’image */
  const [imagePathOverride, setImagePathOverride] = useState(undefined);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentRestaurantId) {
      alert('Sélectionnez une entreprise.');
      return;
    }
    const wasEditing = !!editingCat;
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('nom', formData.nom.trim());
      data.append('nomEn', (formData.nomEn || '').trim());
      if (formData.ordre !== '') data.append('ordre', formData.ordre);
      if (imagePathOverride !== undefined) data.append('imagePath', imagePathOverride);
      data.append('restaurantId', currentRestaurantId);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingCat) {
        await axios.put(`${API_URL}/categories-produit/${editingCat._id}`, data, config);
      } else {
        await axios.post(`${API_URL}/categories-produit`, data, config);
      }
      setShowForm(false);
      setEditingCat(null);
      setFormData({ nom: '', nomEn: '', ordre: '' });
      setImagePreview(null);
      setImagePathOverride(undefined);
      await fetchData();
      alert(wasEditing ? 'Catégorie modifiée.' : 'Catégorie créée.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setFormData({ nom: cat.nom, nomEn: cat.nomEn || '', ordre: cat.ordre != null ? cat.ordre : '' });
    setImagePreview(cat.image ? (String(cat.image).startsWith('http') ? cat.image : `${BASE_URL}${cat.image}`) : null);
    setImagePathOverride(undefined);
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
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingCat(null); setFormData({ nom: '', nomEn: '', ordre: '' }); setImagePreview(null); setImagePathOverride(undefined); }} disabled={!currentRestaurantId}>
            + Ajouter une catégorie
          </button>
        </div>

        <div className="categories-list">
          {categories.map((cat) => (
            <div key={cat._id} className="category-card category-card-admin">
              {cat.image ? (
                <img src={String(cat.image).startsWith('http') ? cat.image : `${BASE_URL}${cat.image}`} alt={cat.nom} className="category-icon-img" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span className="category-icon">📦</span>
              )}
              <span className="category-name">{cat.nom}</span>
              <span className="category-count">{countByCategory(cat._id)} produit(s)</span>
              <div className="plat-actions" style={{ marginLeft: 'auto' }}>
                <DashboardEditIconButton onClick={() => handleEdit(cat)} />
                <DashboardDeleteIconButton onClick={() => handleDelete(cat._id)} />
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
                  <label>{t('i18n', 'nameEn')}</label>
                  <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>{t('i18n', 'nameEnHint')}</p>
                  <input type="text" value={formData.nomEn} onChange={(e) => setFormData({ ...formData, nomEn: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ordre</label>
                  <input type="number" value={formData.ordre} onChange={(e) => setFormData({ ...formData, ordre: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label>Image</label>
                  <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Choisissez une image déjà dans votre galerie.</p>
                  {imagePreview && <img src={imagePreview} alt="Aperçu" className="image-preview" style={{ marginBottom: 8 }} />}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setMediaPickerOpen(true)}>
                      Ouvrir la galerie
                    </button>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/dashboard/medias')}>
                      Importer des images
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => {
                          setImagePreview(null);
                          setImagePathOverride('');
                        }}
                      >
                        Retirer l’image
                      </button>
                    )}
                  </div>
                </div>
                <MediaPickerModal
                  open={mediaPickerOpen}
                  onClose={() => setMediaPickerOpen(false)}
                  onSelect={(path) => {
                    setImagePathOverride(path);
                    setImagePreview(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
                    setMediaPickerOpen(false);
                  }}
                  title="Image de la catégorie produit"
                />
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
