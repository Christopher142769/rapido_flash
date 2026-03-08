import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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
function GeolocateControl({ onGeolocate }) {
  const map = useMap();

  useEffect(() => {
    if (!onGeolocate) return;

    const geolocateControl = L.control({
      position: 'topright'
    });

    geolocateControl.onAdd = function() {
      const div = L.DomUtil.create('div', 'leaflet-control-geolocate');
      div.innerHTML = '<button style="background: white; border: 2px solid rgba(0,0,0,0.2); border-radius: 4px; padding: 8px; cursor: pointer; font-size: 18px;" title="Utiliser ma position">📍</button>';
      
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
  }, [map, onGeolocate]);

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
      {geolocateControl && <GeolocateControl onGeolocate={geolocateControl.onGeolocate} />}
      
      {markers.map((marker, index) => {
        if (!marker.latitude || !marker.longitude) return null;
        
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
            icon={customIcon}
          />
        );
      })}
    </MapContainer>
  );
};

export default LeafletMap;
