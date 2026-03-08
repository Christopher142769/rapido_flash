import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import LeafletMap from '../../components/LeafletMap';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import './LocationSelect.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Utilisation de Nominatim (OpenStreetMap) - Gratuit et open source
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const LocationSelect = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [viewState, setViewState] = useState({
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 13
  });
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Vérifier la permission de géolocalisation
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => {
          setPermissionStatus(result.state);
        };
      });
    }

    // Position par défaut (Paris)
    setPosition({ longitude: 2.3522, latitude: 48.8566 });
    setViewState({ longitude: 2.3522, latitude: 48.8566, zoom: 13 });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (position) {
      // Récupérer l'adresse via l'API Nominatim (OpenStreetMap) - Gratuit et open source
      fetch(`${NOMINATIM_URL}/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'RapidoFlash/1.0'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        })
        .catch(err => console.error('Erreur géocodage:', err));
    }
  }, [position]);

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPosition = { longitude: lng, latitude: lat };
        
        setViewState({
          longitude: lng,
          latitude: lat,
          zoom: 15
        });
        setPosition(newPosition);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code === 1) {
          setPermissionStatus('denied');
        }
      }
    );
  };

  const handleMapClick = (e) => {
    const newPosition = {
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat
    };
    setPosition(newPosition);
    setViewState({
      ...newPosition,
      zoom: viewState.zoom
    });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Utilisation de Nominatim (OpenStreetMap) pour la recherche - Gratuit et open source
      fetch(`${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, {
        headers: {
          'User-Agent': 'RapidoFlash/1.0'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Convertir le format Nominatim au format attendu
            const formattedResults = data.map(item => ({
              place_name: item.display_name,
              geometry: {
                coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
              }
            }));
            setSearchResults(formattedResults);
            setShowSearchResults(true);
          }
        })
        .catch(err => console.error('Erreur recherche:', err));
    }, 300);
  };

  const handleSelectResult = (result) => {
    const [lng, lat] = result.geometry.coordinates;
    const newPosition = { longitude: lng, latitude: lat };
    setPosition(newPosition);
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: 15
    });
    setAddress(result.place_name);
    setSearchQuery(result.place_name);
    setShowSearchResults(false);
  };

  const handleConfirm = async () => {
    if (!position) {
      alert('Veuillez sélectionner une position sur la carte');
      return;
    }

    const locationData = {
      latitude: position.latitude,
      longitude: position.longitude,
      adresse: address || `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
    };

    localStorage.setItem('userLocation', JSON.stringify(locationData));

    // Sauvegarder sur le serveur si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.put(
          `${API_URL}/auth/position`,
          locationData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (error) {
        console.error('Erreur:', error);
      }
    }

    setShowModal(true);
  };

  const handleModalOk = () => {
    setShowModal(false);
    window.dispatchEvent(new Event('locationUpdated'));
    
    // Si l'utilisateur est connecté, aller à la page d'accueil
    // Sinon, rediriger vers la page d'inscription
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="location-select-page">
      <div className="location-map-container">
        <LeafletMap
          initialViewState={viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          markers={position ? [{
            longitude: position.longitude,
            latitude: position.latitude,
            content: '📍'
          }] : []}
          geolocateControl={{
            onGeolocate: (e) => {
              const newPos = {
                longitude: e.coords.longitude,
                latitude: e.coords.latitude
              };
              setPosition(newPos);
              setViewState({
                longitude: e.coords.longitude,
                latitude: e.coords.latitude,
                zoom: 15
              });
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="location-actions-container">
        <div className="location-search-section">
          <div className="address-search-wrapper">
            <input
              type="text"
              placeholder="Rechercher une adresse..."
              className="location-search-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 3 && setShowSearchResults(true)}
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleSelectResult(result)}
                  >
                    {result.place_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="location-buttons">
          <button
            className="btn-use-location"
            onClick={requestLocationPermission}
            disabled={loading || permissionStatus === 'denied'}
          >
            {loading ? '⏳ Récupération...' : '📍 Utiliser ma position'}
          </button>
          <button
            className="btn-confirm-location"
            onClick={handleConfirm}
            disabled={!position}
          >
            Confirmer cette adresse
          </button>
        </div>

        {address && (
          <div className="selected-address">
            <p className="address-label">Adresse sélectionnée :</p>
            <p className="address-text">{address}</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="location-modal-overlay" onClick={handleModalOk}>
          <div className="location-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">📍</div>
            <h2>Localisation enregistrée !</h2>
            <p>Votre adresse de livraison a été sauvegardée.</p>
            {address && (
              <p className="modal-address">{address}</p>
            )}
            <button className="btn btn-primary btn-large" onClick={handleModalOk}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
