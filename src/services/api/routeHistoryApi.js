import { apiRequest } from './client.js';

// PBI-12: history of route searches and favourite trips of the signed-in user.

const INVALID_RESPONSE_MESSAGE = 'El servidor ha devuelto un trayecto no válido.';

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

const isSearch = (search) => typeof search.searchedAt === 'string';
const isFavorite = (favorite) => typeof favorite.name === 'string' && favorite.name.length > 0;

// Only what the backend keeps of a point: its coordinates and the name the user saw.
const tripBody = ({ origin, destination }) => ({
  origin: { lat: origin.lat, lng: origin.lng, label: origin.label ?? null },
  destination: { lat: destination.lat, lng: destination.lng, label: destination.label ?? null },
});

export async function listRouteHistory({ signal } = {}) {
  const data = await apiRequest('/route-history', {
    signal,
    fallbackErrorMessage: 'No se ha podido cargar tu historial.',
  });
  return checked(data?.searches, isSearch);
}

export async function recordRouteSearch(trip) {
  const data = await apiRequest('/route-history', {
    method: 'POST',
    body: JSON.stringify(tripBody(trip)),
    errorMessages: {},
    fallbackErrorMessage: 'No se ha podido guardar la búsqueda en el historial.',
  });
  return checked([data?.search], isSearch)[0];
}

export async function clearRouteHistory() {
  await apiRequest('/route-history', {
    method: 'DELETE',
    errorMessages: {},
    fallbackErrorMessage: 'No se ha podido borrar el historial. Inténtalo de nuevo.',
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
