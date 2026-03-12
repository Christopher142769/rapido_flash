import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import LanguageContext from '../../context/LanguageContext';
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
  const { t } = useContext(LanguageContext);
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
    showInfo(t('settings', 'comingSoon'), t('settings', 'info'));
    setShowPasswordForm(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      showError(t('settings', 'selectImage'), t('settings', 'invalidFormat'));
      return;
    }

    // Vérifier la taille (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      showError(t('settings', 'fileTooBig'), t('settings', 'error'));
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
      
      showSuccess(t('settings', 'photoUpdated'));
      setPhotoPreview(null);
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      showError(error.response?.data?.message || t('settings', 'uploadError'));
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
        <h1>{t('settings', 'title')}</h1>
      </div>

      <div className="settings-content">
        {/* Photo de profil */}
        <div className="settings-section">
          <div className="profile-photo-section">
            <div className="profile-photo">
              {photoPreview ? (
                <img src={photoPreview} alt="" />
              ) : user?.photo ? (
                <img src={user.photo.startsWith('http') ? user.photo : `${BASE_URL}${user.photo}`} alt="" />
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
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <button className="btn btn-outline change-photo-btn" onClick={handleChangePhotoClick} disabled={uploadingPhoto}>
              {uploadingPhoto ? t('settings', 'uploading') : t('settings', 'changePhoto')}
            </button>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="settings-section">
          <h2 className="section-title">{t('settings', 'personalInfo')}</h2>
          {!showEditForm ? (
            <>
              <div className="info-item">
                <span className="info-label">{t('settings', 'name')}</span>
                <span className="info-value">{user?.nom || t('settings', 'notSet')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('settings', 'email')}</span>
                <span className="info-value">{user?.email || t('settings', 'notSet')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('settings', 'phone')}</span>
                <span className="info-value">{user?.telephone || t('settings', 'notSet')}</span>
              </div>
              <button className="btn btn-outline full-width" onClick={() => setShowEditForm(true)} style={{ marginTop: '15px' }}>
                {t('settings', 'editInfo')}
              </button>
            </>
          ) : (
              <PersonalInfoForm user={user} onCancel={() => setShowEditForm(false)} onSuccess={() => { setShowEditForm(false); window.location.reload(); }} t={t} />
            )}
        </div>

        {/* Adresse de livraison */}
        <div className="settings-section">
          <h2 className="section-title">{t('settings', 'deliveryAddress')}</h2>
          <div className="delivery-address-section">
            {userLocation?.adresse ? (
              <div className="address-display">
                <div className="address-icon">📍</div>
                <div className="address-details">
                  <p className="address-text">{userLocation.adresse}</p>
                  <p className="address-coords">{userLocation.latitude?.toFixed(6)}, {userLocation.longitude?.toFixed(6)}</p>
                </div>
              </div>
            ) : (
              <div className="no-address">
                <p>{t('settings', 'noAddressDefined')}</p>
              </div>
            )}
            <button className="btn btn-outline full-width" onClick={() => setShowLocationEditor(true)}>
              {userLocation?.adresse ? t('settings', 'modifyAddress') : t('settings', 'setAddress')}
            </button>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="settings-section">
          <h2 className="section-title">{t('settings', 'security')}</h2>
          {!showPasswordForm ? (
            <button className="btn btn-outline full-width" onClick={() => setShowPasswordForm(true)}>
              {t('settings', 'changePassword')}
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>{t('settings', 'currentPassword')}</label>
                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required placeholder={t('settings', 'currentPassword')} />
              </div>
              <div className="form-group">
                <label>{t('settings', 'newPassword')}</label>
                <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required placeholder={t('settings', 'newPassword')} />
              </div>
              <div className="form-group">
                <label>{t('settings', 'confirmPassword')}</label>
                <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required placeholder={t('settings', 'confirmPassword')} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
                  {t('settings', 'cancel')}
                </button>
                <button type="submit" className="btn btn-primary">{t('settings', 'save')}</button>
              </div>
            </form>
          )}
        </div>

        {/* Déconnexion */}
        <div className="settings-section">
          <button className="btn btn-danger full-width" onClick={logout}>
            {t('settings', 'logout')}
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
const PersonalInfoForm = ({ user, onCancel, onSuccess, t }) => {
  const { t: tCtx } = useContext(LanguageContext);
  const tFn = t || tCtx;
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
      
      showSuccess(tFn('settings', 'infoUpdated'));
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      const errorMsg = error.response?.data?.message || tFn('settings', 'updateError');
      setError(errorMsg);
      showErrorModal(errorMsg, tFn('settings', 'error'));
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
        <label>{tFn('settings', 'name')}</label>
        <input type="text" name="nom" value={formData.nom} onChange={handleChange} required placeholder={tFn('settings', 'yourName')} />
      </div>
      <div className="form-group">
        <label>{tFn('settings', 'email')}</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder={tFn('settings', 'yourEmail')} />
      </div>
      <div className="form-group">
        <label>{tFn('settings', 'phone')}</label>
        <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange} placeholder={tFn('settings', 'yourPhone')} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>{tFn('settings', 'cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? tFn('settings', 'saving') : tFn('settings', 'save')}</button>
      </div>
    </form>
  );
};

export default Settings;
