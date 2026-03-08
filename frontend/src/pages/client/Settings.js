import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import BottomNavbar from '../../components/BottomNavbar';
import TopNavbar from '../../components/TopNavbar';
import LocationEditor from '../../components/LocationEditor';
import './Settings.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useContext(AuthContext);
  const { showSuccess, showError, showWarning, showInfo } = useModal();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    const location = JSON.parse(localStorage.getItem('userLocation') || '{}');
    setUserLocation(location);
    
    const handleLocationUpdate = () => {
      const updatedLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      setUserLocation(updatedLocation);
    };
    
    window.addEventListener('locationUpdated', handleLocationUpdate);
    return () => window.removeEventListener('locationUpdated', handleLocationUpdate);
  }, []);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // TODO: Implémenter le changement de mot de passe
    showInfo('Fonctionnalité à venir', 'Information');
    setShowPasswordForm(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showError('Veuillez sélectionner un fichier image', 'Format invalide');
      return;
    }

    // Vérifier la taille (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      showError('L\'image ne doit pas dépasser 100MB', 'Fichier trop volumineux');
      return;
    }

    // Afficher la prévisualisation
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Uploader la photo
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/users/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      // Mettre à jour l'utilisateur dans le contexte
      const updatedUser = { ...user, photo: `${BASE_URL}${response.data.photo}` };
      setUser(updatedUser);
      
      showSuccess('Photo mise à jour avec succès !');
      setPhotoPreview(null);
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      showError(error.response?.data?.message || 'Erreur lors de l\'upload de la photo');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="settings-page">
      <TopNavbar />
      <div className="settings-header-mobile">
        <button className="back-btn-icon" onClick={() => navigate('/home')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1>Paramètres</h1>
      </div>

      <div className="settings-content">
        {/* Photo de profil */}
        <div className="settings-section">
          <div className="profile-photo-section">
            <div className="profile-photo">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" />
              ) : user?.photo ? (
                <img src={user.photo.startsWith('http') ? user.photo : `${BASE_URL}${user.photo}`} alt="Profile" />
              ) : (
                <div className="profile-placeholder">
                  {user?.nom?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {uploadingPhoto && (
                <div className="photo-upload-overlay">
                  <div className="photo-upload-spinner"></div>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-outline change-photo-btn"
              onClick={handleChangePhotoClick}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? 'Upload en cours...' : 'Changer la photo'}
            </button>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="settings-section">
          <h2 className="section-title">Informations personnelles</h2>
          {!showEditForm ? (
            <>
              <div className="info-item">
                <span className="info-label">Nom</span>
                <span className="info-value">{user?.nom || 'Non défini'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user?.email || 'Non défini'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Téléphone</span>
                <span className="info-value">{user?.telephone || 'Non défini'}</span>
              </div>
              <button
                className="btn btn-outline full-width"
                onClick={() => setShowEditForm(true)}
                style={{ marginTop: '15px' }}
              >
                Modifier les informations
              </button>
            </>
          ) : (
            <PersonalInfoForm 
              user={user}
              onCancel={() => setShowEditForm(false)}
              onSuccess={() => {
                setShowEditForm(false);
                window.location.reload(); // Recharger pour mettre à jour les données
              }}
            />
          )}
        </div>

        {/* Adresse de livraison */}
        <div className="settings-section">
          <h2 className="section-title">Adresse de livraison</h2>
          <div className="delivery-address-section">
            {userLocation?.adresse ? (
              <div className="address-display">
                <div className="address-icon">📍</div>
                <div className="address-details">
                  <p className="address-text">{userLocation.adresse}</p>
                  <p className="address-coords">
                    {userLocation.latitude?.toFixed(6)}, {userLocation.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="no-address">
                <p>Aucune adresse de livraison définie</p>
              </div>
            )}
            <button
              className="btn btn-outline full-width"
              onClick={() => setShowLocationEditor(true)}
            >
              {userLocation?.adresse ? 'Modifier l\'adresse' : 'Définir une adresse'}
            </button>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="settings-section">
          <h2 className="section-title">Sécurité</h2>
          {!showPasswordForm ? (
            <button
              className="btn btn-outline full-width"
              onClick={() => setShowPasswordForm(true)}
            >
              Changer le mot de passe
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Mot de passe actuel"
                />
              </div>
              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Nouveau mot de passe"
                />
              </div>
              <div className="form-group">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Confirmer le mot de passe"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Déconnexion */}
        <div className="settings-section">
          <button className="btn btn-danger full-width" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </div>
      <BottomNavbar />
      
      {showLocationEditor && (
        <LocationEditor
          onClose={() => setShowLocationEditor(false)}
          onSave={(locationData) => {
            setUserLocation(locationData);
            setShowLocationEditor(false);
          }}
        />
      )}
    </div>
  );
};

// Composant pour le formulaire de modification des informations personnelles
const PersonalInfoForm = ({ user, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setUser } = useContext(AuthContext);
  const { showSuccess, showError: showErrorModal } = useModal();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/users/me`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Mettre à jour l'utilisateur dans le contexte
      const updatedUser = { ...user, ...response.data.user };
      setUser(updatedUser);
      
      showSuccess('Informations mises à jour avec succès !');
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      const errorMsg = error.response?.data?.message || 'Erreur lors de la mise à jour';
      setError(errorMsg);
      showErrorModal(errorMsg, 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="personal-info-form">
      {error && (
        <div className="form-error" style={{ 
          background: '#FFE5E5', 
          color: '#F44336', 
          padding: '10px', 
          borderRadius: '8px', 
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      <div className="form-group">
        <label>Nom</label>
        <input
          type="text"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          required
          placeholder="Votre nom"
        />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Votre email"
        />
      </div>
      <div className="form-group">
        <label>Téléphone</label>
        <input
          type="tel"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          placeholder="Votre numéro de téléphone"
        />
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
};

export default Settings;
