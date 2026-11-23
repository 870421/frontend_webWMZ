import { apiRequest } from './client.js';

// The simple route preferences of the account (PBI-18, ADR-036): shade or sun, avoid the wind, go
// through parks and the extra minutes. The backend turns them into weights; here they are answers.
// With them, whether «Según el tiempo de hoy» is on (PBI-21, ADR-037): on for a new user.
export const SUN_SHADE_OPTIONS = ['shade', 'sun', 'any'];
export const EXTRA_MINUTES_OPTIONS = [0, 2, 5, 10, 15];
export const DEFAULT_PREFERENCES = Object.freeze({
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
  byWeather: true,
});

const INVALID_RESPONSE_MESSAGE = 'El servidor ha devuelto unas preferencias no válidas.';
const INVALID_SUGGESTION_MESSAGE = 'El servidor ha devuelto una respuesta del tiempo no válida.';

// «byWeather» may be missing in a backend before PBI-21: then it is off.
export function isValidPreferences(preferences) {
  return (
    SUN_SHADE_OPTIONS.includes(preferences?.sunShade) &&
    typeof preferences.avoidWind === 'boolean' &&
    typeof preferences.preferParks === 'boolean' &&
    EXTRA_MINUTES_OPTIONS.includes(preferences.extraMinutes) &&
    ['boolean', 'undefined'].includes(typeof preferences.byWeather)
  );
}

function checked(preferences) {
  if (!isValidPreferences(preferences)) throw new Error(INVALID_RESPONSE_MESSAGE);
  const { sunShade, avoidWind, preferParks, extraMinutes, byWeather = false } = preferences;
  return { sunShade, avoidWind, preferParks, extraMinutes, byWeather };
}

export async function getRoutePreferences({ signal } = {}) {
  const data = await apiRequest('/route-preferences', {
    signal,
    fallbackErrorMessage: 'No se han podido cargar tus preferencias.',
  });
  return checked(data?.preferences);
}

export async function saveRoutePreferences(preferences, { signal } = {}) {
  const { sunShade, avoidWind, preferParks, extraMinutes, byWeather } = preferences;
  const data = await apiRequest('/route-preferences', {
    method: 'PUT',
    signal,
    body: JSON.stringify({ sunShade, avoidWind, preferParks, extraMinutes, byWeather }),
    errorMessages: { 400: 'Revisa tus preferencias.' },
    fallbackErrorMessage: 'No se han podido guardar tus preferencias.',
  });
  return checked(data?.preferences);
}

function checkedSuggestion(suggestion) {
  const { status, answers, message } = suggestion ?? {};
  const validAnswers =
    status === 'unavailable'
      ? answers === null
      : SUN_SHADE_OPTIONS.includes(answers?.sunShade) && typeof answers.avoidWind === 'boolean';
  if (
    !['available', 'unavailable'].includes(status) ||
    !validAnswers ||
    typeof message !== 'string'
  ) {
    throw new Error(INVALID_SUGGESTION_MESSAGE);
  }
  return {
    status,
    message,
    answers: answers && { sunShade: answers.sunShade, avoidWind: answers.avoidWind },
  };
}

/**
 * What «Según el tiempo de hoy» marks with the current weather (PBI-21, ADR-037): the answers to
 * shade or sun and to the wind, never «Por parques», and the reason in plain words. Without weather
 * the status is «unavailable» and there are no answers.
 */
export async function getWeatherSuggestion({ signal } = {}) {
  const data = await apiRequest('/route-preferences/weather', {
    signal,
    fallbackErrorMessage: 'No se ha podido consultar el tiempo de hoy.',
  });
  return checkedSuggestion(data?.suggestion);
}
