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
      429: 'Place search is busy. Please try again shortly.',
      503: 'Place search is not configured. You can still use the map or GPS.',
      504: 'Place search timed out. Edit the search to try again.'
    };
    throw new Error(messages[response.status] || 'Place search is unavailable right now.');
  }

  return response.json();
}
