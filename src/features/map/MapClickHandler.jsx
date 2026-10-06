import { useMapEvents } from 'react-leaflet';

export function MapClickHandler({ onSelectPoint }) {
  useMapEvents({
    click(event) {
      onSelectPoint({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        source: 'map',
      });
    },
  });

  return null;
}
