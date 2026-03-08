import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import './Bannieres.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Bannieres = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [bannieres, setBannieres] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 100MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (selectedRestaurant) {
        formData.append('restaurantId', selectedRestaurant);
      }

      await axios.post(`${API_URL}/bannieres`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSelectedFile(null);
      setPreview(null);
      document.getElementById('file-input').value = '';
      await fetchBannieres();
      alert('Bannière uploadée avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'upload');
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
    return <div className="loading-state">Chargement...</div>;
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
          <h2>Ajouter une nouvelle bannière (photo de plat)</h2>
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
          <div className="upload-container">
            <div className="file-input-wrapper">
              <input
                type="file"
                id="file-input"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                {preview ? (
                  <img src={preview} alt="Preview" className="preview-image" />
                ) : (
                  <div className="upload-placeholder">
                    <span className="upload-icon">📷</span>
                    <span>Cliquez pour sélectionner une image</span>
                    <small>JPG, PNG (max 100MB)</small>
                  </div>
                )}
              </label>
            </div>
            {selectedFile && (
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Upload en cours...' : 'Uploader la bannière'}
              </button>
            )}
          </div>
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
                      src={`${API_URL.replace('/api', '')}${banniere.image}`}
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
