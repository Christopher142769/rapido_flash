import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './Categories.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const Categories = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [plats, setPlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlat, setEditingPlat] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix: '',
    image: '',
    categorie: '',
    disponible: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [platsRes, restaurantsRes] = await Promise.all([
        axios.get(`${API_URL}/plats`, config),
        axios.get(`${API_URL}/restaurants/my/restaurants`, config)
      ]);
      
      setPlats(platsRes.data);
      
      // Extraire les catégories uniques
      const uniqueCategories = [...new Set(platsRes.data.map(plat => plat.categorie).filter(Boolean))];
      setCategories(uniqueCategories);
      
      if (uniqueCategories.length > 0 && !selectedCategorie) {
        setSelectedCategorie(uniqueCategories[0]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorieSelect = (categorie) => {
    setSelectedCategorie(categorie);
    setShowForm(false);
    setEditingPlat(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (plat) => {
    setEditingPlat(plat);
    setFormData({
      nom: plat.nom,
      description: plat.description || '',
      prix: plat.prix.toString(),
      image: plat.image || '',
      categorie: plat.categorie || '',
      disponible: plat.disponible !== false
    });
    setImagePreview(plat.image ? `${BASE_URL}${plat.image}` : null);
    setImageFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const submitData = new FormData();
      submitData.append('nom', formData.nom);
      submitData.append('description', formData.description);
      submitData.append('prix', formData.prix);
      submitData.append('categorie', formData.categorie);
      submitData.append('disponible', formData.disponible);

      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (formData.image && !imageFile) {
        submitData.append('image', formData.image);
      }

      config.headers['Content-Type'] = 'multipart/form-data';

      if (editingPlat) {
        await axios.put(`${API_URL}/plats/${editingPlat._id}`, submitData, config);
      } else {
        await axios.post(`${API_URL}/plats`, submitData, config);
      }

      setShowForm(false);
      setEditingPlat(null);
      setFormData({
        nom: '',
        description: '',
        prix: '',
        image: '',
        categorie: '',
        disponible: true
      });
      setImageFile(null);
      setImagePreview(null);
      await fetchData();
      alert(editingPlat ? 'Plat modifié avec succès !' : 'Plat créé avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement du plat');
    }
  };

  const handleDelete = async (platId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      await axios.delete(`${API_URL}/plats/${platId}`, config);
      await fetchData();
      alert('Plat supprimé avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression du plat');
    }
  };

  const filteredPlats = selectedCategorie
    ? plats.filter(plat => plat.categorie === selectedCategorie)
    : plats;

  if (loading) {
    return <div className="loading-state">Chargement...</div>;
  }

  return (
    <div className="categories-page">
      <DashboardSidebar onLogout={logout} />
      <div className="categories-content">
        <div className="categories-header">
          <h1>Gestion des Catégories et Plats</h1>
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true);
            setEditingPlat(null);
            setFormData({
              nom: '',
              description: '',
              prix: '',
              image: '',
              categorie: selectedCategorie || '',
              disponible: true
            });
            setImageFile(null);
            setImagePreview(null);
          }}>
            + Ajouter un plat
          </button>
        </div>

        {/* Liste des catégories */}
        <div className="categories-list">
          <button
            className={`category-card ${selectedCategorie === null ? 'active' : ''}`}
            onClick={() => handleCategorieSelect(null)}
          >
            <span className="category-icon">📋</span>
            <span className="category-name">Tous les plats</span>
            <span className="category-count">{plats.length}</span>
          </button>
          {categories.map((categorie) => {
            const count = plats.filter(p => p.categorie === categorie).length;
            return (
              <button
                key={categorie}
                className={`category-card ${selectedCategorie === categorie ? 'active' : ''}`}
                onClick={() => handleCategorieSelect(categorie)}
              >
                <span className="category-icon">{categorie.split(' ')[0]}</span>
                <span className="category-name">{categorie}</span>
                <span className="category-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Formulaire d'ajout/modification */}
        {showForm && (
          <div className="modal-overlay" onClick={() => {
            setShowForm(false);
            setEditingPlat(null);
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{editingPlat ? 'Modifier le plat' : 'Ajouter un plat'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nom du plat *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Prix (FCFA) *</label>
                  <input
                    type="number"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Image</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  )}
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.disponible}
                      onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                    />
                    Disponible
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => {
                    setShowForm(false);
                    setEditingPlat(null);
                  }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPlat ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Liste des plats de la catégorie sélectionnée */}
        <div className="plats-section">
          <h2>
            {selectedCategorie ? `Plats - ${selectedCategorie}` : 'Tous les plats'}
            <span className="plats-count">({filteredPlats.length})</span>
          </h2>
          <div className="plats-grid">
            {filteredPlats.map((plat) => (
              <div key={plat._id} className="plat-card-admin">
                <img 
                  src={getImageUrl(plat.image, plat, BASE_URL)} 
                  alt={plat.nom} 
                  className="plat-image-admin"
                  onError={(e) => {
                    e.target.src = getImageUrl(null, plat, BASE_URL);
                  }}
                />
                <div className="plat-info-admin">
                  <h3>{plat.nom}</h3>
                  {plat.description && <p>{plat.description}</p>}
                  <div className="plat-details">
                    <span className="plat-prix-admin">{plat.prix.toFixed(2)} FCFA</span>
                    {plat.categorie && <span className="plat-categorie">{plat.categorie}</span>}
                  </div>
                  <div className="plat-actions">
                    <button className="btn btn-secondary btn-small" onClick={() => handleEdit(plat)}>
                      Modifier
                    </button>
                    <button className="btn btn-outline btn-small" onClick={() => handleDelete(plat._id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
