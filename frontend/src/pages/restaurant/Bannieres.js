import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import MediaPickerModal from '../../components/MediaPickerModal';
import './Bannieres.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Bannieres = () => {
  const { logout } = useContext(AuthContext);
  const [bannieres, setBannieres] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMediaPath, setSelectedMediaPath] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedMode, setSelectedMode] = useState('web');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetchBannieres();
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/restaurants/my/restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRestaurants(res.data);
      if (res.data.length > 0) {
        setSelectedRestaurant(res.data[0]._id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchBannieres = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/bannieres/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBannieres(res.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const BASE_URL = API_URL.replace('/api', '');

  const onMediaChosen = (path) => {
    setSelectedMediaPath(path);
    setPreview(String(path).startsWith('http') ? path : `${BASE_URL}${path}`);
    setMediaPickerOpen(false);
  };

  const handleUploadFromMedia = async () => {
    if (!selectedMediaPath) {
      alert('Choisissez une image dans la galerie (menu « Galerie d’images »).');
      return;
    }
    if (!selectedRestaurant) {
      alert('Sélectionnez un restaurant associé.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/bannieres/from-media`,
        { imagePath: selectedMediaPath, restaurantId: selectedRestaurant, mode: selectedMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedMediaPath(null);
      setPreview(null);
      await fetchBannieres();
      alert('Bannière ajoutée depuis la galerie.');
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'ajout');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (id, actif) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/bannieres/${id}`,
        { actif: !actif },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      await fetchBannieres();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette bannière ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/bannieres/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchBannieres();
      alert('Bannière supprimée avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleOrderChange = async (id, newOrder) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/bannieres/${id}`,
        { ordre: parseInt(newOrder) },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      await fetchBannieres();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des bannières..." />;
  }

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="bannieres-page">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <h1>Gestion des Bannières</h1>
            </div>

        {/* Section Upload */}
        <div className="upload-section">
          <h2>Ajouter une bannière depuis la galerie</h2>
          <p style={{ color: '#666', marginBottom: 8, maxWidth: 700 }}>
            Format conseille web: 1426 x 270 px. Format conseille mobile: 320 x 145 px.
          </p>
          <p style={{ color: '#666', marginBottom: 16, maxWidth: 560 }}>
            Importez vos images dans <strong>Galerie d’images</strong>, puis sélectionnez-les ici. Une même image peut servir partout sur le site.
          </p>
          {restaurants.length > 0 && (
            <div className="form-group" style={{ marginBottom: '20px', maxWidth: '400px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--dark-brown)' }}>Restaurant associé *</label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  width: '100%',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-brown)'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              >
                {restaurants.map(resto => (
                  <option key={resto._id} value={resto._id}>{resto.nom}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: '20px', maxWidth: '400px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--dark-brown)' }}>Mode d'affichage *</label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '16px',
                width: '100%',
                transition: 'all 0.3s'
              }}
            >
              <option value="web">Web (desktop)</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div className="upload-container">
            <div className="file-input-wrapper" style={{ border: '2px dashed #E0E0E0', borderRadius: 12, padding: 24, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {preview ? (
                <img src={preview} alt="Aperçu" className="preview-image" style={{ maxHeight: 200 }} />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">🖼️</span>
                  <span>Aucune image sélectionnée</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMediaPickerOpen(true)}
                disabled={!selectedRestaurant}
              >
                Ouvrir la galerie
              </button>
              {selectedMediaPath && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setSelectedMediaPath(null); setPreview(null); }}
                >
                  Effacer le choix
                </button>
              )}
              {selectedMediaPath && (
                <button
                  className="btn btn-primary"
                  onClick={handleUploadFromMedia}
                  disabled={uploading}
                >
                  {uploading ? 'Ajout…' : 'Ajouter cette bannière'}
                </button>
              )}
            </div>
          </div>

          <MediaPickerModal
            open={mediaPickerOpen}
            onClose={() => setMediaPickerOpen(false)}
            onSelect={onMediaChosen}
            title="Choisir l’image de bannière"
          />
        </div>

        {/* Liste des bannières */}
        <div className="bannieres-list">
          <h2>Bannières existantes ({bannieres.length})</h2>
          {bannieres.length === 0 ? (
            <div className="empty-state">
              <p>Aucune bannière pour le moment</p>
            </div>
          ) : (
            <div className="bannieres-grid">
              {bannieres.map((banniere) => (
                <div key={banniere._id} className={`banniere-card ${!banniere.actif ? 'inactive' : ''}`}>
                  <div className="banniere-image">
                    <img
                      src={String(banniere.image || '').startsWith('http') ? banniere.image : `${API_URL.replace('/api', '')}${banniere.image}`}
                      alt={`Bannière ${banniere.ordre + 1}`}
                    />
                    {!banniere.actif && (
                      <div className="inactive-overlay">
                        <span>Inactive</span>
                      </div>
                    )}
                  </div>
                  <div className="banniere-controls">
                    <div className="control-group">
                      <label>Mode: {banniere.mode === 'mobile' ? 'Mobile' : 'Web'}</label>
                    </div>
                    <div className="control-group">
                      <label>Ordre d'affichage:</label>
                      <input
                        type="number"
                        min="0"
                        value={banniere.ordre}
                        onChange={(e) => handleOrderChange(banniere._id, e.target.value)}
                        className="order-input"
                      />
                    </div>
                    <div className="control-buttons">
                      <button
                        className={`btn-toggle ${banniere.actif ? 'active' : ''}`}
                        onClick={() => handleToggleActive(banniere._id, banniere.actif)}
                      >
                        {banniere.actif ? '✓ Active' : '✗ Inactive'}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(banniere._id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Bannieres;
