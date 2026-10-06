import { apiRequest } from './client.js';

export function getApiHealth() {
  return apiRequest('/health');
}

const ROUTE_ERROR_MESSAGES = {
  400: 'El origen o el destino no son válidos.',
  429: 'El servicio de rutas está ocupado. Inténtalo de nuevo en unos instantes.',
  503: 'El cálculo de rutas no está configurado.',
  504: 'El cálculo de la ruta ha tardado demasiado. Inténtalo de nuevo.',
};

function isValidRoute(route) {
  return (
    route?.geometry?.type === 'LineString' &&
    Array.isArray(route.geometry.coordinates) &&
    route.geometry.coordinates.length >= 2 &&
    route.geometry.coordinates.every(
      (coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1])
    ) &&
    Number.isFinite(route.distance) &&
    route.distance >= 0 &&
    Number.isFinite(route.duration) &&
    route.duration >= 0
  );
}

export async function getFastestRoute({ origin, destination }, { signal } = {}) {
  const data = await apiRequest('/routes/fastest', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
    }),
    errorMessages: ROUTE_ERROR_MESSAGES,
    fallbackErrorMessage: 'No se ha podido calcular la ruta. Inténtalo de nuevo.',
  });

  if (!isValidRoute(data?.route)) {
    throw new Error('El servidor ha devuelto una ruta no válida. Inténtalo de nuevo.');
  }

  return data.route;
}
