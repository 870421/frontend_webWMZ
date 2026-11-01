import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function MapFocusHandler({ point }) {
  const map = useMap();

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  // Depends on the position, not the object: receiving the name of a point must not move the map.
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      return;
    }

    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.7,
    });
  }, [map, lat, lng]);

  return null;
}
