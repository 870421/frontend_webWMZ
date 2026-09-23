import { MapContainer, TileLayer } from 'react-leaflet';

import { LocationMarker } from './LocationMarker.jsx';
import { MapClickHandler } from './MapClickHandler.jsx';
import { MapFocusHandler } from './MapFocusHandler.jsx';

const ZARAGOZA_CENTER = [41.6488, -0.8891];
const noop = () => {};

export function MapView({
  activePoint = 'origin',
  destination,
  focusPoint,
  onSelectPoint = noop,
  origin
}) {
  return (
    <div className="map-wrapper">
      <MapContainer
        center={ZARAGOZA_CENTER}
        zoom={13}
        className="map-view"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelectPoint={onSelectPoint} />
        <MapFocusHandler point={focusPoint} />
        <LocationMarker point={origin} title="Origin" />
        <LocationMarker point={destination} title="Destination" />
      </MapContainer>
      <div className="map-selection-hint" aria-live="polite">
        Tap the map to set {activePoint === 'origin' ? 'origin' : 'destination'}.
      </div>
    </div>
  );
}
