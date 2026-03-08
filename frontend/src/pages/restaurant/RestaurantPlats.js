import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import { getImageUrl } from '../../utils/imagePlaceholder';
import './RestaurantPlats.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const RestaurantPlats = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [plats, setPlats] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const [platsRes, restaurantsRes] = await Promise.all([
        axios.get(`${API_URL}/plats`),
        axios.get(`${API_URL}/restaurants/my/restaurants`)
      ]);
      setPlats(platsRes.data);
      setRestaurants(restaurantsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      const submitData = new FormData();
      submitData.append('nom', formData.nom);
      submitData.append('description', formData.description);
      submitData.append('prix', formData.prix);
      submitData.append('categorie', formData.categorie);
      submitData.append('disponible', formData.disponible);

      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (formData.image) {
        submitData.append('image', formData.image);
      }

      if (editingPlat) {
        await axios.put(`${API_URL}/plats/${editingPlat._id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${API_URL}/plats`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowForm(false);
      setEditingPlat(null);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        nom: '',
        description: '',
        prix: '',
        image: '',
        categorie: '',
        disponible: true
      });
      await fetchData();
      alert('Plat enregistré avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (plat) => {
    setEditingPlat(plat);
    setFormData({
      nom: plat.nom,
      description: plat.description || '',
      prix: plat.prix,
      image: plat.image || '',
      categorie: plat.categorie || '',
      disponible: plat.disponible
    });
    if (plat.image) {
      setImagePreview(`${API_URL.replace('/api', '')}${plat.image}`);
    }
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) {
      try {
        await axios.delete(`${API_URL}/plats/${id}`);
        await fetchData();
        alert('Plat supprimé');
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const togglePlatRestaurant = async (platId, restaurantId, disponible) => {
    try {
      await axios.post(`${API_URL}/plats/${platId}/restaurants/${restaurantId}`, {
        disponible: !disponible
      });
      await fetchData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <div className="loading-state">Chargement...</div>;
  }

  const myRestaurant = restaurants[0];

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="plats-content">
        <div className="plats-header">
          <h1>Gestion des plats</h1>
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true);
            setEditingPlat(null);
            setFormData({
              nom: '',
              description: '',
              prix: '',
              image: '',
              categorie: '',
              disponible: true
            });
          }}>
            + Ajouter un plat
          </button>
        </div>

        {showForm && (
          <div className="plat-form-modal">
            <div className="modal-content">
              <h2>{editingPlat ? 'Modifier le plat' : 'Nouveau plat'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nom *</label>
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Prix (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.prix}
                      onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Catégorie</label>
                    <input
                      type="text"
                      value={formData.categorie}
                      onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Photo du plat (bannière)</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-input"
                      id="plat-image-upload"
                    />
                    <label htmlFor="plat-image-upload" className="file-upload-label">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Plat preview" className="image-preview" />
                      ) : (
                        <div className="file-upload-placeholder">
                          <span>📷</span>
                          <span>Choisir une photo</span>
                        </div>
                      )}
                    </label>
                  </div>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Ou entrer une URL d'image"
                    style={{ marginTop: '10px' }}
                  />
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

        <div className="plats-grid">
          {plats.map((plat) => {
            const restaurantPlat = plat.restaurants?.find(r => 
              r.restaurant.toString() === myRestaurant?._id
            );
            const isAvailable = restaurantPlat?.disponible ?? false;

            return (
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
                    <span className="plat-prix-admin">{plat.prix.toFixed(2)} €</span>
                    {plat.categorie && <span className="plat-categorie">{plat.categorie}</span>}
                  </div>
                  <div className="plat-actions">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={() => togglePlatRestaurant(plat._id, myRestaurant?._id, isAvailable)}
                      />
                      <span>Disponible dans mon restaurant</span>
                    </label>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-small" onClick={() => handleEdit(plat)}>
                        Modifier
                      </button>
                      <button className="btn btn-outline btn-small" onClick={() => handleDelete(plat._id)}>
                        Supprimer
                      </button>
                    </div>
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
