import { useEffect } from 'react';
import { CircleMarker, useMap } from 'react-leaflet';

const FOLLOW_ZOOM = 17;
const MARKER_STYLE = { color: '#ffffff', fillColor: '#1f6fa8', fillOpacity: 1, weight: 3 };

// The position of the user while walking a route; the map follows it.
export function NavigationMarker({ position }) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.setView([lat, lng], Math.max(map.getZoom(), FOLLOW_ZOOM), { animate: true });
  }, [map, lat, lng]);

  if (!position) return null;

  return (
    <CircleMarker center={[lat, lng]} radius={9} interactive={false} pathOptions={MARKER_STYLE} />
  );
}
