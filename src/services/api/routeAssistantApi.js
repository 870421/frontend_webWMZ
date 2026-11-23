import { ASSISTANT_NAME } from '../../features/route-assistant/assistantName.js';
import { apiRequest } from './client.js';
import { isValidPreferences } from './routePreferencesApi.js';
import { normalizeWeightedComparison } from './routesApi.js';

// The statuses of the route assistant (PBI-9.2, ADR-033). Only "applied" brings a new route; the
// others bring a notice and the current route stays.
export const ASSISTANT_STATUSES = [
  'applied',
  'no_change',
  'not_understood',
  'model_error',
  'timeout',
  'provider_busy',
  'not_configured',
];
// What an answer of the assistant may change: the same questions as the panel (PBI-18, ADR-036).
const CHANGE_QUESTIONS = ['sunShade', 'avoidWind', 'preferParks', 'extraMinutes'];

const ASSISTANT_ERROR_MESSAGES = {
  401: `Tu sesión ha caducado. Inicia sesión de nuevo para usar a ${ASSISTANT_NAME}.`,
  400: 'No se ha podido enviar la petición. Revisa el texto y vuelve a intentarlo.',
  429: `Has hecho muchas peticiones a ${ASSISTANT_NAME}. Espera un poco y vuelve a intentarlo.`,
  502: 'OpenRouteService no ha podido recalcular la ruta. Tu ruta no ha cambiado.',
  504: 'El cálculo de la ruta ha tardado demasiado. Tu ruta no ha cambiado.',
};

function isValidAssistant(assistant) {
  if (!ASSISTANT_STATUSES.includes(assistant?.status) || !isValidPreferences(assistant.before)) {
    return false;
  }
  if (assistant.status !== 'applied') return typeof assistant.message === 'string';
  return (
    typeof assistant.explanation === 'string' &&
    isValidPreferences(assistant.after) &&
    Array.isArray(assistant.changes) &&
    assistant.changes.every((change) => CHANGE_QUESTIONS.includes(change?.question))
  );
}

/**
 * Asks the route assistant to adjust the preferences of the current route with the user's words.
 * Only the request and the answers travel; the backend talks to the language model. `comparison` is
 * a weighted comparison when the assistant applied new answers, and null otherwise.
 */
export async function askRouteAssistant(
  { origin, destination, date, time, timeZone, message, preferences },
  { signal } = {}
) {
  let data;
  try {
    data = await apiRequest('/routes/assistant', {
      method: 'POST',
      signal,
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        date,
        time,
        timeZone,
        message,
        preferences,
      }),
      errorMessages: ASSISTANT_ERROR_MESSAGES,
      fallbackErrorMessage: `${ASSISTANT_NAME} no está disponible ahora mismo. Tu ruta no ha cambiado.`,
    });
  } catch (error) {
    // The limits say which one was reached and until when (per minute or per day).
    if (error.status === 429 && error.serverMessage) error.message = error.serverMessage;
    throw error;
  }

  const assistant = data?.assistant;
  const comparison =
    assistant?.status === 'applied' ? normalizeWeightedComparison(data.comparison) : null;
  if (!isValidAssistant(assistant) || (assistant.status === 'applied' && !comparison)) {
    throw new Error(
      `${ASSISTANT_NAME} ha devuelto una respuesta no válida. Tu ruta no ha cambiado.`
    );
  }
  return { assistant, comparison };
}
