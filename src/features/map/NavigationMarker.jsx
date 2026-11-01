import { useEffect } from 'react';
import { CircleMarker, useMap, useMapEvents } from 'react-leaflet';

const FOLLOW_ZOOM = 17;
const MARKER_STYLE = { color: '#ffffff', fillColor: '#1f6fa8', fillOpacity: 1, weight: 3 };

// The position of the user while walking a route. The map follows it if asked to, but moving the map
// by hand wins: the next position must not take it away from the user.
export function NavigationMarker({ position, follow = false, onUserDrag }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;

  useMapEvents({
    dragstart: () => {
      if (follow) onUserDrag();
    },
  });

  useEffect(() => {
    if (!follow) return;
    map.setView([lat, lng], Math.max(map.getZoom(), FOLLOW_ZOOM), { animate: true });
  }, [map, follow, lat, lng]);

  if (!position) return null;

  return (
    <CircleMarker center={[lat, lng]} radius={9} interactive={false} pathOptions={MARKER_STYLE} />
  );
}
