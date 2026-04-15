import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_MARKER_ICON = L.icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Composant pour gérer les clics sur la carte
function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick({
          lngLat: {
            lng: e.latlng.lng,
            lat: e.latlng.lat
          }
        });
      }
    }
  });
  return null;
}

// Composant pour gérer le mouvement de la carte
function MapMoveHandler({ onMove }) {
  const map = useMap();
  
  useEffect(() => {
    if (!onMove) return;
    
    const handleMove = () => {
      const center = map.getCenter();
      onMove({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom()
        }
      });
    };

    map.on('move', handleMove);
    return () => {
      map.off('move', handleMove);
    };
  }, [map, onMove]);
  
  return null;
}

// Composant pour le contrôle de géolocalisation
const GEOLOCATE_PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#8B4513" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/></svg>';

function GeolocateControl({ onGeolocate, title = 'Utiliser ma position' }) {
  const map = useMap();

  useEffect(() => {
    if (!onGeolocate) return;

    const geolocateControl = L.control({
      position: 'topright'
    });

    geolocateControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-control-geolocate');
      const safeTitle = String(title || 'Utiliser ma position')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
      div.innerHTML =
        `<button type="button" style="background: white; border: 2px solid rgba(0,0,0,0.2); border-radius: 4px; padding: 6px 8px; cursor: pointer; display:flex;align-items:center;justify-content:center;" title="${safeTitle}" aria-label="${safeTitle}">${GEOLOCATE_PIN_SVG}</button>`;
      
      L.DomEvent.on(div, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              map.setView([lat, lng], 15);
              if (onGeolocate) {
                onGeolocate({
                  coords: {
                    longitude: lng,
                    latitude: lat
                  }
                });
              }
            },
            (error) => {
              console.error('Erreur géolocalisation:', error);
            }
          );
        }
      });

      return div;
    };

    geolocateControl.addTo(map);

    return () => {
      map.removeControl(geolocateControl);
    };
  }, [map, onGeolocate, title]);

  return null;
}

const LeafletMap = ({ 
  initialViewState, 
  onMove, 
  onClick, 
  markers = [], 
  geolocateControl = false,
  style = {}
}) => {
  const center = [initialViewState.latitude, initialViewState.longitude];
  const zoom = initialViewState.zoom || 13;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', ...style }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {onClick && <MapClickHandler onClick={onClick} />}
      {onMove && <MapMoveHandler onMove={onMove} />}
      {geolocateControl && (
        <GeolocateControl
          onGeolocate={geolocateControl.onGeolocate}
          title={geolocateControl.title}
        />
      )}
      
      {markers.map((marker, index) => {
        if (marker.latitude == null || marker.longitude == null) return null;
        
        const customIcon = marker.content 
          ? L.divIcon({
              className: 'custom-leaflet-marker',
              html: `<div style="font-size: 24px; text-align: center; line-height: 30px;">${marker.content}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })
          : undefined;

        return (
          <Marker
            key={index}
            position={[marker.latitude, marker.longitude]}
            icon={customIcon || DEFAULT_MARKER_ICON}
          />
        );
      })}
    </MapContainer>
  );
};

export default LeafletMap;
