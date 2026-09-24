import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';

import { formatPointLabel } from '../route-search/useRoutePoints.js';

function createMarkerIcon(type) {
  return L.divIcon({
    className: `location-marker-icon location-marker-icon-${type}`,
    html: `<span>${type === 'origin' ? 'A' : 'B'}</span>`,
    iconAnchor: [14, 32],
    iconSize: [28, 32],
    popupAnchor: [0, -28]
  });
}

export function LocationMarker({ point, title }) {
  if (!point) {
    return null;
  }

  const type = title.toLowerCase();

  return (
    <Marker icon={createMarkerIcon(type)} position={[point.lat, point.lng]} title={title} alt={title}>
      <Popup>
        <strong>{title}</strong>
        <br />
        {formatPointLabel(point)}
      </Popup>
    </Marker>
  );
}
