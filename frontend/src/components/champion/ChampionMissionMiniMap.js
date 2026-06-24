import React, { useMemo } from 'react';
import LeafletMap from '../LeafletMap';

function buildMarkers(mission, championLocation) {
  const markers = [];
  if (mission?.pickupLat != null && mission?.pickupLng != null) {
    markers.push({
      latitude: mission.pickupLat,
      longitude: mission.pickupLng,
      content: '📦',
    });
  }
  if (mission?.deliveryLat != null && mission?.deliveryLng != null) {
    markers.push({
      latitude: mission.deliveryLat,
      longitude: mission.deliveryLng,
      content: '🏠',
    });
  }
  if (championLocation?.latitude != null && championLocation?.longitude != null) {
    markers.push({
      latitude: championLocation.latitude,
      longitude: championLocation.longitude,
      content: '🛵',
    });
  }
  return markers;
}

function computeView(markers) {
  if (!markers.length) {
    return { latitude: 6.3703, longitude: 2.3912, zoom: 12 };
  }
  const lats = markers.map((m) => m.latitude);
  const lngs = markers.map((m) => m.longitude);
  const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
  const longitude = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs)
  );
  let zoom = 14;
  if (span > 0.06) zoom = 13;
  if (span > 0.12) zoom = 12;
  if (span > 0.25) zoom = 11;
  return { latitude, longitude, zoom };
}

export default function ChampionMissionMiniMap({ mission, championLocation, height = 160 }) {
  const markers = useMemo(
    () => buildMarkers(mission, championLocation),
    [mission, championLocation]
  );
  const view = useMemo(() => computeView(markers), [markers]);

  if (markers.length < 2) return null;

  return (
    <div className="champion-mini-map" style={{ height }}>
      <LeafletMap initialViewState={view} markers={markers} style={{ borderRadius: 12 }} />
      <div className="champion-mini-map-legend">
        <span>📦 Retrait</span>
        <span>🏠 Livraison</span>
        {championLocation ? <span>🛵 Vous</span> : null}
      </div>
    </div>
  );
}
