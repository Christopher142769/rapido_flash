import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import LeafletMap from './LeafletMap';
import axios from 'axios';
import LanguageContext from '../context/LanguageContext';
import { useModal } from '../context/ModalContext';
import './LocationEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Utilisation de Nominatim (OpenStreetMap) - Gratuit et open source
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const MIN_INSTRUCTION_LEN = 3;

const LocationEditor = ({ onClose, onSave }) => {
  const { t } = useContext(LanguageContext);
  const { showError } = useModal();
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 2.3522,
    latitude: 48.8566,
    zoom: 13
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [instruction, setInstruction] = useState('');
  const [telephoneContact, setTelephoneContact] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Récupérer la localisation actuelle
    const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
    if (userLocation.latitude && userLocation.longitude) {
      setPosition({
        longitude: userLocation.longitude,
        latitude: userLocation.latitude
      });
      setViewState({
        longitude: userLocation.longitude,
        latitude: userLocation.latitude,
        zoom: 15
      });
      setAddress(userLocation.adresse || '');
      setInstruction(userLocation.instruction || '');
      setTelephoneContact(userLocation.telephoneContact || '');
      setLoading(false);
    } else {
      // Utiliser la géolocalisation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos = {
              longitude: pos.coords.longitude,
              latitude: pos.coords.latitude
            };
            setPosition(newPos);
            setViewState({
              ...newPos,
              zoom: 15
            });
            setLoading(false);
          },
          () => {
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    }
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

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude
          };
          setPosition(newPos);
          setViewState({
            ...newPos,
            zoom: 15
          });
        },
        (error) => {
          showError(t('locationEditor', 'geolocError'), t('locationEditor', 'geolocErrorTitle'));
        }
      );
    }
  };

  const handleSave = async () => {
    if (!position) return;

    const telDigits = String(telephoneContact || '').replace(/\D/g, '');
    if (telDigits.length < 8) {
      showError(t('checkout', 'telephoneRequired'), t('common', 'error'));
      return;
    }
    if (String(instruction || '').trim().length < MIN_INSTRUCTION_LEN) {
      showError(t('checkout', 'instructionRequired'), t('common', 'error'));
      return;
    }

    setSaving(true);
    try {
      const locationData = {
        latitude: position.latitude,
        longitude: position.longitude,
        adresse: address,
        instruction: (instruction || '').trim(),
        telephoneContact: (telephoneContact || '').trim()
      };

      localStorage.setItem('userLocation', JSON.stringify(locationData));
      
      // Sauvegarder sur le serveur si l'utilisateur est connecté
      const token = localStorage.getItem('token');
      if (token) {
        await axios.put(
          `${API_URL}/auth/position`,
          locationData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      window.dispatchEvent(new Event('locationUpdated'));
      if (onSave) onSave(locationData);
      if (onClose) onClose();
    } catch (error) {
      console.error('Erreur:', error);
      showError(t('locationEditor', 'saveError'), t('common', 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="location-editor-modal">
      <div className="location-editor-content">
        <div className="location-editor-header">
          <h2>{t('locationEditor', 'title')}</h2>
          <button className="close-btn" onClick={onClose} aria-label={t('locationEditor', 'cancel')}>×</button>
        </div>

        <div className="location-editor-body">
          <div className="search-address-section">
            <div className="address-search-wrapper">
              <input
                type="text"
                placeholder={t('locationEditor', 'searchPlaceholder')}
                className="address-search-input"
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
            <button
              type="button"
              className="btn-use-location"
              onClick={handleUseCurrentLocation}
            >
              <span className="location-editor-btn-inner">
                <FaMapMarkerAlt className="location-editor-btn-icon" aria-hidden />
                <span>{t('locationEditor', 'useMyLocation')}</span>
              </span>
            </button>
            {!showMap ? (
              <button
                type="button"
                className="btn-toggle-map"
                onClick={() => setShowMap(true)}
              >
                {t('checkout', 'openMapToChoose')}
              </button>
            ) : (
              <button
                type="button"
                className="btn-toggle-map btn-toggle-map-secondary"
                onClick={() => setShowMap(false)}
              >
                {t('locationEditor', 'hideMap')}
              </button>
            )}
          </div>

          {!loading && showMap && (
            <div className="map-container-editor">
              <LeafletMap
                initialViewState={viewState}
                onMove={evt => setViewState(evt.viewState)}
                onClick={handleMapClick}
                markers={position ? [{
                  longitude: position.longitude,
                  latitude: position.latitude
                }] : []}
                geolocateControl={{
                  title: t('locationEditor', 'useMyLocation'),
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
                style={{ width: '100%', height: '400px', borderRadius: '12px' }}
              />
            </div>
          )}

          {address && (
            <div className="address-display-section">
              <p className="address-label">{t('locationEditor', 'selectedAddress')}</p>
              <p className="address-value">{address}</p>
            </div>
          )}

          <div className="location-editor-extra-fields">
            <label className="location-editor-label" htmlFor="loc-instruction">{t('locationEditor', 'instructionLabel')}</label>
            <textarea
              id="loc-instruction"
              className="location-editor-textarea"
              rows={2}
              placeholder={t('locationEditor', 'instructionPlaceholder')}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <label className="location-editor-label" htmlFor="loc-tel">{t('locationEditor', 'telephoneLabel')}</label>
            <input
              id="loc-tel"
              type="tel"
              className="location-editor-input"
              placeholder={t('locationEditor', 'telephonePlaceholder')}
              value={telephoneContact}
              onChange={(e) => setTelephoneContact(e.target.value)}
            />
          </div>
        </div>

        <div className="location-editor-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {t('locationEditor', 'cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!position || saving}
          >
            {saving ? t('locationEditor', 'saving') : t('locationEditor', 'save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationEditor;
