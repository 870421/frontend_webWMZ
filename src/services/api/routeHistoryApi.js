import { apiRequest } from './client.js';

// PBI-12: favourite trips and, since #180, the places used recently as origin or destination (they
// replace the history of trips) of the signed-in user.

const INVALID_RESPONSE_MESSAGE = 'El servidor ha devuelto un trayecto no válido.';
const INVALID_PLACES_MESSAGE = 'El servidor ha devuelto un lugar no válido.';

const isPoint = (point) =>
  Number.isFinite(point?.lat) &&
  Number.isFinite(point?.lng) &&
  (point.label === null || typeof point.label === 'string');

const isTrip = (trip) =>
  Number.isInteger(trip?.id) && isPoint(trip.origin) && isPoint(trip.destination);

function checked(items, extraCheck) {
  if (!Array.isArray(items) || !items.every((item) => isTrip(item) && extraCheck(item))) {
    throw new Error(INVALID_RESPONSE_MESSAGE);
  }
  return items;
}

const isFavorite = (favorite) => typeof favorite.name === 'string' && favorite.name.length > 0;

// Only what the backend keeps of a point: its coordinates and the name the user saw.
const tripBody = ({ origin, destination }) => ({
  origin: { lat: origin.lat, lng: origin.lng, label: origin.label ?? null },
  destination: { lat: destination.lat, lng: destination.lng, label: destination.label ?? null },
});

const isPlace = (place) =>
  Number.isInteger(place?.id) && isPoint(place) && typeof place.usedAt === 'string';

function checkedPlaces(places) {
  if (!Array.isArray(places) || !places.every(isPlace)) throw new Error(INVALID_PLACES_MESSAGE);
  return places;
}

// The recent places (#180), newest first.
export async function listRecentPlaces({ signal } = {}) {
  const data = await apiRequest('/recent-places', {
    signal,
    fallbackErrorMessage: 'No se han podido cargar tus lugares recientes.',
  });
  return checkedPlaces(data?.places);
}

// One or two places in the order they were used (origin, destination); only their coordinates and
// the name the user saw. The answer is the list as it is now.
export async function recordRecentPlaces(places) {
  const data = await apiRequest('/recent-places', {
    method: 'POST',
    body: JSON.stringify({
      places: places.map(({ lat, lng, label }) => ({ lat, lng, label: label ?? null })),
    }),
    errorMessages: {},
    fallbackErrorMessage: 'No se han podido guardar los lugares recientes.',
  });
  return checkedPlaces(data?.places);
}

export async function clearRecentPlaces() {
  await apiRequest('/recent-places', {
    method: 'DELETE',
    errorMessages: {},
    fallbackErrorMessage: 'No se han podido borrar los lugares recientes. Inténtalo de nuevo.',
  });
}

export async function listRouteFavorites({ signal } = {}) {
  const data = await apiRequest('/route-favorites', {
    signal,
    fallbackErrorMessage: 'No se han podido cargar tus favoritos.',
  });
  return checked(data?.favorites, isFavorite);
}

export async function addRouteFavorite(trip, name = '') {
  const data = await apiRequest('/route-favorites', {
    method: 'POST',
    body: JSON.stringify({ ...tripBody(trip), name }),
    errorMessages: {
      400: 'Revisa el nombre del favorito.',
      409: 'Ese trayecto ya está en tus favoritos o has llegado al máximo de 20.',
    },
    fallbackErrorMessage: 'No se ha podido guardar el favorito. Inténtalo de nuevo.',
  });
  return checked([data?.favorite], isFavorite)[0];
}

export async function removeRouteFavorite(id) {
  try {
    await apiRequest(`/route-favorites/${id}`, {
      method: 'DELETE',
      errorMessages: {},
      fallbackErrorMessage: 'No se ha podido quitar el favorito. Inténtalo de nuevo.',
    });
  } catch (error) {
    // Already gone counts as removed.
    if (error.status !== 404) throw error;
  }
}
