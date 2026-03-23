import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import './Categories.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const CategoriesDomaine = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nom: '', nomEn: '', ordre: '' });
  const [iconePreview, setIconePreview] = useState(null);
  const [iconePathOverride, setIconePathOverride] = useState(undefined);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories-domaine`);
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const wasEditing = !!editingId;
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('nom', formData.nom.trim());
      data.append('nomEn', (formData.nomEn || '').trim());
      if (formData.ordre !== '') data.append('ordre', formData.ordre);
      if (iconePathOverride !== undefined) data.append('iconePath', iconePathOverride);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) {
        await axios.put(`${API_URL}/categories-domaine/${editingId}`, data, config);
      } else {
        await axios.post(`${API_URL}/categories-domaine`, data, config);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nom: '', nomEn: '', ordre: '' });
      setIconePreview(null);
      setIconePathOverride(undefined);
      await fetchData();
      alert(wasEditing ? 'Catégorie modifiée.' : 'Catégorie créée.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat._id);
    setFormData({ nom: cat.nom, nomEn: cat.nomEn || '', ordre: cat.ordre != null ? cat.ordre : '' });
    setIconePreview(cat.icone ? (String(cat.icone).startsWith('http') ? cat.icone : `${BASE_URL}${cat.icone}`) : null);
    setIconePathOverride(undefined);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette catégorie domaine ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/categories-domaine/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      alert('Catégorie supprimée.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;

  return (
    <div className="categories-page">
      <DashboardSidebar onLogout={logout} />
      <div className="categories-content">
        <div className="categories-header">
          <h1>Catégories domaine</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Ces catégories permettent de classer les structures (ex: Alimentation, Électronique, Mode).</p>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setFormData({ nom: '', nomEn: '', ordre: '' }); setIconePreview(null); setIconePathOverride(undefined); }}>
            + Ajouter une catégorie
          </button>
        </div>

        <div className="categories-list">
          {categories.map((cat) => (
            <div key={cat._id} className="category-card category-card-admin">
              {cat.icone ? (
                <img src={String(cat.icone).startsWith('http') ? cat.icone : `${BASE_URL}${cat.icone}`} alt={cat.nom} className="category-icon-img" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span className="category-icon">📦</span>
              )}
              <span className="category-name">{cat.nom}</span>
              <div className="plat-actions" style={{ marginLeft: 'auto' }}>
                <button className="btn btn-secondary btn-small" onClick={() => handleEdit(cat)}>Modifier</button>
                <button className="btn btn-outline btn-small" onClick={() => handleDelete(cat._id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingId(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie domaine'}</h2>
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
                  <label>Ordre d'affichage</label>
                  <input type="number" value={formData.ordre} onChange={(e) => setFormData({ ...formData, ordre: e.target.value })} min="0" />
                </div>
                <div className="form-group">
                  <label>Icône</label>
                  <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px' }}>Icône choisie dans votre galerie d’images (compte).</p>
                  {iconePreview && <img src={iconePreview} alt="Aperçu" className="image-preview" style={{ maxWidth: 80, marginTop: 8 }} />}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      Ouvrir la galerie
                    </button>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/dashboard/medias')}>
                      Importer des images
                    </button>
                    {iconePreview && (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        onClick={() => {
                          setIconePreview(null);
                          setIconePathOverride('');
                        }}
                      >
                        Retirer l’icône
                      </button>
                    )}
                  </div>
                </div>
                <MediaPickerModal
                  open={mediaPickerOpen}
                  onClose={() => setMediaPickerOpen(false)}
                  onSelect={(path) => {
                    setIconePathOverride(path);
                    setIconePreview(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
                    setMediaPickerOpen(false);
                  }}
                  title="Icône catégorie domaine"
                />
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</button>
                  <button type="submit" className="btn btn-primary">{editingId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesDomaine;
