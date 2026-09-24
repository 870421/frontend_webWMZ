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

  useEffect(() => {
    if (!point) {
      return;
    }

    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.7
    });
  }, [map, point]);

  return null;
}
