import { apiRequest } from './client.js';

export function autocompletePlaces(text, options = {}) {
  const params = new URLSearchParams({
    limit: '5',
    text,
  });

  return apiRequest(`/geocoding/autocomplete?${params.toString()}`, options);
}

export function reversePlace({ lat, lng }, options = {}) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });

  return apiRequest(`/geocoding/reverse?${params.toString()}`, options);
}
