// Extent of the municipality published by IDEZAR, the same one the backend uses to validate the
// imported urban data (backend/src/config/importConfig.js). There is no shade data outside it.
const ZARAGOZA_AREA = { minLat: 41.4518, minLng: -1.1862, maxLat: 41.8103, maxLng: -0.685 };

// The map may show a small margin around the municipality, so its edge is not stuck to the screen.
const MAP_MARGIN_DEGREES = 0.03;

export const MAP_BOUNDS = [
  [ZARAGOZA_AREA.minLat - MAP_MARGIN_DEGREES, ZARAGOZA_AREA.minLng - MAP_MARGIN_DEGREES],
  [ZARAGOZA_AREA.maxLat + MAP_MARGIN_DEGREES, ZARAGOZA_AREA.maxLng + MAP_MARGIN_DEGREES],
];

// Farthest zoom out: the whole municipality fits, but not the rest of Spain.
export const MAP_MIN_ZOOM = 11;

export const OUTSIDE_ZARAGOZA_MESSAGE =
  'WeatherMapZ solo funciona dentro de Zaragoza. Elige un punto del término municipal.';

export function isInsideZaragoza({ lat, lng }) {
  return (
    lat >= ZARAGOZA_AREA.minLat &&
    lat <= ZARAGOZA_AREA.maxLat &&
    lng >= ZARAGOZA_AREA.minLng &&
    lng <= ZARAGOZA_AREA.maxLng
  );
}
