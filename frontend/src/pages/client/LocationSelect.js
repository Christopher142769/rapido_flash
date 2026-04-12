import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import './LocationSelect.css';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Icône personnalisée pour la localisation
const locationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationMarker({ position, setPosition, isAnimating }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker 
      position={position} 
      icon={locationIcon}
      className={isAnimating ? 'marker-animating' : ''}
    />
  ) : null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);

  return null;
}

const LocationSelect = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [isAnimating, setIsAnimating] = useState(false);
  const [mapCenter, setMapCenter] = useState([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(13);
  const [showModal, setShowModal] = useState(false);

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
    setPosition([48.8566, 2.3522]);
    setMapCenter([48.8566, 2.3522]);
  }, []);

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
        
        // Animation du pointeur
        setIsAnimating(true);
        setMapCenter([lat, lng]);
        setMapZoom(15);
        
        // Délai pour l'animation
        setTimeout(() => {
          setPosition([lat, lng]);
          setIsAnimating(false);
          setLoading(false);
          setPermissionStatus('granted');
          
          // Récupérer l'adresse
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
              if (data.display_name) {
                setAddress(data.display_name);
                setShowModal(true);
              }
            })
            .catch(() => {});
        }, 1500);
      },
      (error) => {
        setLoading(false);
        setPermissionStatus('denied');
        if (error.code === error.PERMISSION_DENIED) {
          alert('Permission de géolocalisation refusée. Vous pouvez sélectionner votre position sur la carte.');
        } else {
          alert('Impossible de récupérer votre position');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handlePermissionAccept = () => {
    requestLocationPermission();
  };

  const handlePermissionDeny = () => {
    setPermissionStatus('denied');
    // L'utilisateur peut toujours cliquer sur la carte
  };

  const handleContinue = () => {
    if (position) {
      // Stocker la position dans localStorage pour l'utiliser plus tard
      localStorage.setItem('userLocation', JSON.stringify({
        latitude: position[0],
        longitude: position[1],
        adresse: address
      }));
      navigate('/login');
    }
  };

  return (
    <div className="location-select-page">
      {/* Carte pleine écran */}
      <div className="location-map-container">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100vh', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          <LocationMarker 
            position={position} 
            setPosition={setPosition}
            isAnimating={isAnimating}
          />
        </MapContainer>
      </div>

      {/* Conteneur courbé en haut avec drop shadow */}
      <div className="location-actions-container">
        {/* Demande de permission */}
        {permissionStatus === 'prompt' && (
          <div className="permission-request">
            <div className="permission-icon" aria-hidden>
              <FaMapMarkerAlt size={28} />
            </div>
            <h3>Autoriser la localisation</h3>
            <p>Cette application souhaite utiliser votre position actuelle pour vous proposer les meilleurs restaurants à proximité.</p>
            <div className="permission-buttons">
              <button 
                className="btn btn-outline permission-deny"
                onClick={handlePermissionDeny}
              >
                Refuser
              </button>
              <button 
                className="btn btn-primary permission-accept"
                onClick={handlePermissionAccept}
              >
                Accepter
              </button>
            </div>
          </div>
        )}

        {/* Actions après permission */}
        {(permissionStatus === 'granted' || permissionStatus === 'denied') && (
          <>
            <button
              className="btn btn-secondary location-btn"
              onClick={requestLocationPermission}
              disabled={loading || permissionStatus === 'denied'}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Récupération...</span>
                </>
              ) : (
                <>
                  <FaMapMarkerAlt aria-hidden />
                  <span>Utiliser ma position</span>
                </>
              )}
            </button>

            <button
              className="btn btn-primary continue-btn"
              onClick={handleContinue}
              disabled={!position}
            >
              Continuer
            </button>
          </>
        )}
      </div>

      {/* Modale pour les infos de localisation */}
      {showModal && position && address && (
        <div className="location-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="location-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon" aria-hidden>
                <FaMapMarkerAlt size={28} />
              </div>
              <h3>Position récupérée</h3>
            </div>
            <div className="modal-content">
              <p className="modal-address">{address}</p>
              <div className="modal-coords">
                <span>Lat: {position[0].toFixed(6)}</span>
                <span>Lng: {position[1].toFixed(6)}</span>
              </div>
            </div>
            <button
              className="btn btn-primary modal-ok-btn"
              onClick={() => {
                setShowModal(false);
                handleContinue();
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
