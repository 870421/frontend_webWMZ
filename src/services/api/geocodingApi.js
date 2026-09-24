import { apiRequest } from './client.js';

export function autocompletePlaces(text, options = {}) {
  const params = new URLSearchParams({
    limit: '5',
    text
  });

  return apiRequest(`/geocoding/autocomplete?${params.toString()}`, options);
}
