import { API_BASE_URL } from './apiEnvironment.js';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const messages = {
      429: 'La búsqueda de lugares está ocupada. Inténtalo de nuevo en unos instantes.',
      503: 'La búsqueda de lugares no está configurada. Puedes seguir usando el mapa o el GPS.',
      504: 'La búsqueda ha tardado demasiado. Edita el texto para intentarlo de nuevo.'
    };
    throw new Error(messages[response.status] || 'La búsqueda de lugares no está disponible ahora mismo.');
  }

  return response.json();
}
