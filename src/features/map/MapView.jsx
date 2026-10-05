import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

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
        zoomControl={false}
        className="map-view"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapClickHandler onSelectPoint={onSelectPoint} />
        <MapFocusHandler point={focusPoint} />
        <LocationMarker point={origin} title="Origen" type="origin" />
        <LocationMarker point={destination} title="Destino" type="destination" />
      </MapContainer>
      <div className="map-selection-hint" aria-live="polite">
        Toca el mapa para fijar el {activePoint === 'origin' ? 'origen' : 'destino'}.
      </div>
      <div className="map-legend" aria-label="Leyenda de marcadores del mapa">
        <span><i className="legend-dot legend-dot-origin" aria-hidden="true" />Origen</span>
        <span><i className="legend-dot legend-dot-destination" aria-hidden="true" />Destino</span>
      </div>
    </div>
  );
}
