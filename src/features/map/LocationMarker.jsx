import L from 'leaflet';
import { Circle, Marker, Popup } from 'react-leaflet';

import { formatPointLabel } from '../route-search/useRoutePoints.js';

function createMarkerIcon(type) {
  return L.divIcon({
    className: `location-marker-icon location-marker-icon-${type}`,
    html: '<svg viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C7.72 1 1 7.72 1 16c0 11.1 15 25 15 25s15-13.9 15-25C31 7.72 24.28 1 16 1Z"/><circle cx="16" cy="16" r="6"/></svg>',
    iconAnchor: [16, 41],
    iconSize: [32, 42],
    popupAnchor: [0, -36]
  });
}

export function LocationMarker({ point, title, type }) {
  if (!point) {
    return null;
  }

  return (
    <>
      {point.source === 'device' && <Circle center={[point.lat, point.lng]} radius={50}
        interactive={false} pathOptions={{ color: type === 'origin' ? '#2faa73' : '#3998dc', fillOpacity: 0.12, weight: 2 }} />}
      <Marker icon={createMarkerIcon(type)} position={[point.lat, point.lng]} title={title} alt={title}>
        <Popup>
          <strong>{title}</strong>
          <br />
          {formatPointLabel(point)}
          {point.source === 'device' && <p>Círculo de referencia de 50 m. La precisión de la ubicación puede variar.</p>}
        </Popup>
      </Marker>
    </>
  );
}
