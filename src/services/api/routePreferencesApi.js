import { apiRequest } from './client.js';

// The simple route preferences of the account (PBI-18, ADR-036): shade or sun, avoid the wind, go
// through parks and the extra minutes. The backend turns them into weights; here they are answers.
export const SUN_SHADE_OPTIONS = ['shade', 'sun', 'any'];
export const EXTRA_MINUTES_OPTIONS = [0, 2, 5, 10, 15];
export const DEFAULT_PREFERENCES = Object.freeze({
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
});

const INVALID_RESPONSE_MESSAGE = 'El servidor ha devuelto unas preferencias no válidas.';

export function isValidPreferences(preferences) {
  return (
    SUN_SHADE_OPTIONS.includes(preferences?.sunShade) &&
    typeof preferences.avoidWind === 'boolean' &&
    typeof preferences.preferParks === 'boolean' &&
    EXTRA_MINUTES_OPTIONS.includes(preferences.extraMinutes)
  );
}

function checked(preferences) {
  if (!isValidPreferences(preferences)) throw new Error(INVALID_RESPONSE_MESSAGE);
  const { sunShade, avoidWind, preferParks, extraMinutes } = preferences;
  return { sunShade, avoidWind, preferParks, extraMinutes };
}

export async function getRoutePreferences({ signal } = {}) {
  const data = await apiRequest('/route-preferences', {
    signal,
    fallbackErrorMessage: 'No se han podido cargar tus preferencias.',
  });
  return checked(data?.preferences);
}

export async function saveRoutePreferences(preferences, { signal } = {}) {
  const { sunShade, avoidWind, preferParks, extraMinutes } = preferences;
  const data = await apiRequest('/route-preferences', {
    method: 'PUT',
    signal,
    body: JSON.stringify({ sunShade, avoidWind, preferParks, extraMinutes }),
    errorMessages: { 400: 'Revisa tus preferencias.' },
    fallbackErrorMessage: 'No se han podido guardar tus preferencias.',
  });
  return checked(data?.preferences);
}
