// Fixed data of the end-to-end test (#161, ADR-034). The fake services answer with it and the
// mini-dataset of the database is built on the same lines, so the backend finds its street segments.
// The places and the street are invented; only their coordinates are inside Zaragoza.

// [lng, lat], as in GeoJSON and in OpenRouteService.
const NORTH = [-0.88, 41.656];
const MIDDLE = [-0.88, 41.654];
const SOUTH = [-0.88, 41.652];
const WEST_NORTH = [-0.8806, 41.655];
const WEST_SOUTH = [-0.8806, 41.653];

export const PLACES = {
  origin: { id: 'e2e:origin', label: 'Plaza de Prueba Norte, Zaragoza', coordinates: NORTH },
  destination: {
    id: 'e2e:destination',
    label: 'Plaza de Prueba Sur, Zaragoza',
    coordinates: SOUTH,
  },
};

// Straight line of 445 m and a detour of 466 m to the west, about 5 % longer: inside the 25 % of
// extra time that the recommended route accepts.
export const ROUTES = {
  fastest: { coordinates: [NORTH, MIDDLE, SOUTH], distance: 444.8, duration: 318 },
  alternative: {
    coordinates: [NORTH, WEST_NORTH, WEST_SOUTH, SOUTH],
    distance: 466.2,
    duration: 333,
  },
};

// What the user sees for the fastest route: 445 m and ceil(318 s) = 6 min.
export const FASTEST_ROUTE_TEXT = { distance: '445 m', duration: '6 min' };

// Mild and with a strong cierzo (north-west wind): the reason of the recommended route speaks of the
// cierzo by day and by night, so the test does not depend on the height of the Sun.
export const WEATHER = {
  temperature: 18,
  apparentTemperature: 18,
  windSpeed: 40,
  windGusts: 60,
  windDirection: 300,
  weatherCode: 1,
};

// Street segments of the mini-dataset: one per straight piece of the two routes.
export const SEGMENTS = [
  ['E2E_FASTEST_1', NORTH, MIDDLE],
  ['E2E_FASTEST_2', MIDDLE, SOUTH],
  ['E2E_ALTERNATIVE_1', NORTH, WEST_NORTH],
  ['E2E_ALTERNATIVE_2', WEST_NORTH, WEST_SOUTH],
  ['E2E_ALTERNATIVE_3', WEST_SOUTH, SOUTH],
];

// A tall building to the west of the detour (shade), trees along it and a small park (green).
export const BUILDINGS = [['E2E_BUILDING_1', [-0.8809, 41.6532, -0.88075, 41.6548], 20]];
export const TREES = [
  ['E2E_TREE_1', [-0.88068, 41.6535]],
  ['E2E_TREE_2', [-0.88068, 41.654]],
  ['E2E_TREE_3', [-0.88068, 41.6545]],
];
export const GREEN_AREAS = [['E2E_PARK_1', [-0.88055, 41.6533, -0.8803, 41.6547]]];
