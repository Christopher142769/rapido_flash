import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import DashboardSidebar from '../../components/DashboardSidebar';
import PageLoader from '../../components/PageLoader';
import './Dashboard.css';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function RestaurantMarker({ position }) {
  return position ? <Marker position={position} /> : null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { showSuccess, showError, showWarning } = useModal();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState([6.3725, 2.3544]); // Cotonou, Bénin par défaut
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    telephone: '',
    whatsapp: '',
    email: '',
    latitude: '',
    longitude: '',
    adresse: '',
    fraisLivraison: 0
  });
  const [editing, setEditing] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [banniereFile, setBanniereFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannierePreview, setBannierePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const res = await axios.get(`${API_URL}/restaurants/my/restaurants`);
      if (res.data.length > 0) {
        const resto = res.data[0];
        setRestaurant(resto);
        setFormData({
          nom: resto.nom || '',
          description: resto.description || '',
          telephone: resto.telephone || '',
          whatsapp: resto.whatsapp || '',
          email: resto.email || '',
          latitude: resto.position?.latitude || '',
          longitude: resto.position?.longitude || '',
          adresse: resto.position?.adresse || '',
          fraisLivraison: resto.fraisLivraison || 0
        });
        if (resto.position?.latitude) {
          setPosition([resto.position.latitude, resto.position.longitude]);
        }
        if (resto.logo) {
          setLogoPreview(`${API_URL.replace('/api', '')}${resto.logo}`);
        }
        if (resto.banniere) {
          setBannierePreview(`${API_URL.replace('/api', '')}${resto.banniere}`);
        }
      } else {
        setEditing(true);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    setPosition([lat, lng]);
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString()
    });

    // Récupérer l'adresse
    fetch(`${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
      .then(res => res.json())
      .then(data => {
        if (data.display_name) {
          setFormData(prev => ({ ...prev, adresse: data.display_name }));
        }
      })
      .catch(err => console.error('Erreur géocodage inverse:', err));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query + ', Bénin')}&limit=5&addressdetails=1&countrycodes=bj`
        );
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Erreur recherche:', error);
      }
    }, 500);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
      adresse: result.display_name
    });
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      } else if (type === 'banniere') {
        setBanniereFile(file);
        setBannierePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nom || !formData.latitude || !formData.longitude) {
      alert('Veuillez remplir tous les champs obligatoires (Nom, Latitude, Longitude)');
      return;
    }

    try {
      // Validation côté client
      if (!formData.nom || formData.nom.trim() === '') {
        showWarning('Le nom du restaurant est requis', 'Champ requis');
        return;
      }
      
      if (!formData.latitude || isNaN(parseFloat(formData.latitude))) {
        showWarning('Veuillez sélectionner une position sur la carte ou entrer une latitude valide', 'Position requise');
        return;
      }
      
      if (!formData.longitude || isNaN(parseFloat(formData.longitude))) {
        showWarning('Veuillez sélectionner une position sur la carte ou entrer une longitude valide', 'Position requise');
        return;
      }

      // S'assurer que les valeurs sont valides
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        showWarning('Les coordonnées GPS ne sont pas valides. Veuillez cliquer sur la carte ou utiliser la recherche d\'adresse.', 'Coordonnées invalides');
        return;
      }

      const submitData = new FormData();
      submitData.append('nom', formData.nom.trim());
      submitData.append('description', (formData.description || '').trim());
      submitData.append('telephone', (formData.telephone || '').trim());
      submitData.append('whatsapp', (formData.whatsapp || '').trim());
      submitData.append('email', (formData.email || '').trim());
      submitData.append('latitude', lat.toString());
      submitData.append('longitude', lng.toString());
      submitData.append('adresse', (formData.adresse || '').trim());
      submitData.append('fraisLivraison', (formData.fraisLivraison ? parseFloat(formData.fraisLivraison) : 0).toString());

      // Debug: Afficher les données envoyées
      console.log('Données envoyées:', {
        nom: formData.nom.trim(),
        latitude: lat.toString(),
        longitude: lng.toString(),
        adresse: formData.adresse
      });
      
      // Vérifier que FormData contient bien les valeurs
      for (let pair of submitData.entries()) {
        console.log('FormData:', pair[0], '=', pair[1]);
      }

      if (logoFile) {
        submitData.append('logo', logoFile);
      }
      if (banniereFile) {
        submitData.append('banniere', banniereFile);
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          // Ne PAS définir Content-Type manuellement pour FormData
          // Axios le définira automatiquement avec le bon boundary
          'Authorization': `Bearer ${token}`
        }
      };

      if (restaurant) {
        // Mettre à jour
        await axios.put(`${API_URL}/restaurants/${restaurant._id}`, submitData, config);
      } else {
        // Créer
        const res = await axios.post(`${API_URL}/restaurants`, submitData, config);
        setRestaurant(res.data);
      }
      setEditing(false);
      setLogoFile(null);
      setBanniereFile(null);
      await fetchRestaurant();
      showSuccess('Restaurant enregistré avec succès !');
    } catch (error) {
      console.error('Erreur complète:', error);
      console.error('Réponse erreur:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de l\'enregistrement';
      showError(`Erreur: ${errorMessage}`, 'Erreur d\'enregistrement');
    }
  };

  if (loading) {
    return <PageLoader message="Chargement du dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      <DashboardSidebar onLogout={logout} />
      <div className="dashboard-main">
        <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Mon Restaurant</h1>
          {restaurant && !editing && (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="restaurant-form">
            <div className="form-section">
              <h2>Informations générales</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom du restaurant *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    placeholder="Ex: +229 61 23 45 67"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Ex: +229 61 23 45 67"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Frais de livraison (FCFA)</label>
                  <input
                    type="number"
                    value={formData.fraisLivraison}
                    onChange={(e) => setFormData({ ...formData, fraisLivraison: e.target.value })}
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                    placeholder="Décrivez votre restaurant..."
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Photos du restaurant</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Logo du restaurant</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="file-input"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="file-upload-label">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="image-preview" />
                      ) : (
                        <div className="file-upload-placeholder">
                          <span>📷</span>
                          <span>Choisir un logo</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Bannière du restaurant</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'banniere')}
                      className="file-input"
                      id="banniere-upload"
                    />
                    <label htmlFor="banniere-upload" className="file-upload-label">
                      {bannierePreview ? (
                        <img src={bannierePreview} alt="Bannière preview" className="image-preview" />
                      ) : (
                        <div className="file-upload-placeholder">
                          <span>🖼️</span>
                          <span>Choisir une bannière</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Position sur la carte</h2>
              <p className="section-description">
                Recherchez une adresse ou cliquez sur la carte pour définir la position de votre restaurant
              </p>
              
              {/* Barre de recherche d'adresse */}
              <div className="address-search-container" style={{ marginBottom: '20px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Rechercher une adresse au Bénin (ex: Cotonou, Porto-Novo...)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="address-search-input"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E0E0E0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'all 0.3s'
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchResults(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSearchResults(false), 200);
                  }}
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '2px solid #E0E0E0',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectSearchResult(result)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: index < searchResults.length - 1 ? '1px solid #E0E0E0' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--primary-brown)', marginBottom: '4px' }}>
                          {result.display_name}
                        </div>
                        {result.address && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {result.address.city || result.address.town || result.address.village || ''}
                            {result.address.postcode && ` - ${result.address.postcode}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="map-container-large">
                <MapContainer
                  center={position}
                  zoom={13}
                  style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                  key={`${position[0]}-${position[1]}`}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  <RestaurantMarker position={position} />
                </MapContainer>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => {
                      const lat = e.target.value;
                      setFormData({ ...formData, latitude: lat });
                      if (lat && !isNaN(parseFloat(lat))) {
                        setPosition([parseFloat(lat), position[1]]);
                      }
                    }}
                    required
                    placeholder="Ex: 6.3725"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => {
                      const lng = e.target.value;
                      setFormData({ ...formData, longitude: lng });
                      if (lng && !isNaN(parseFloat(lng))) {
                        setPosition([position[0], parseFloat(lng)]);
                      }
                    }}
                    required
                    placeholder="Ex: 2.3544"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => {
                setEditing(false);
                if (restaurant) fetchRestaurant();
              }}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <div className="restaurant-display">
            <div className="restaurant-info-card">
              <h2>{restaurant?.nom}</h2>
              {restaurant?.description && <p>{restaurant.description}</p>}
              {restaurant?.telephone && <p>📞 {restaurant.telephone}</p>}
              {restaurant?.whatsapp && <p>💬 WhatsApp: {restaurant.whatsapp}</p>}
              {restaurant?.email && <p>✉️ {restaurant.email}</p>}
              {restaurant?.position && (
                <div className="position-info">
                  <p><strong>Position:</strong></p>
                  <p>Lat: {restaurant.position.latitude.toFixed(6)}</p>
                  <p>Lng: {restaurant.position.longitude.toFixed(6)}</p>
                  {restaurant.position.adresse && <p>{restaurant.position.adresse}</p>}
                </div>
              )}
            </div>

            {restaurant?.position && (
              <div className="map-display">
                <MapContainer
                  center={[restaurant.position.latitude, restaurant.position.longitude]}
                  zoom={15}
                  style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RestaurantMarker position={[restaurant.position.latitude, restaurant.position.longitude]} />
                </MapContainer>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });
  return null;
}

export default Dashboard;
