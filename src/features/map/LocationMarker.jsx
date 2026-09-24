import L from 'leaflet';
import { Circle, Marker, Popup } from 'react-leaflet';

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
    <>
      {point.source === 'device' && <Circle center={[point.lat, point.lng]} radius={50}
        interactive={false} pathOptions={{ color: type === 'origin' ? '#175c4c' : '#b7462f', fillOpacity: 0.12, weight: 2 }} />}
      <Marker icon={createMarkerIcon(type)} position={[point.lat, point.lng]} title={title} alt={title}>
        <Popup>
          <strong>{title}</strong>
          <br />
          {formatPointLabel(point)}
          {point.source === 'device' && <p>50 m reference circle. Location accuracy may vary.</p>}
        </Popup>
      </Marker>
    </>
  );
}
