import { autocompletePlaces, reversePlace } from './geocodingApi.js';
import { apiRequest } from './client.js';

jest.mock('./client.js', () => ({
  apiRequest: jest.fn(),
}));

describe('reversePlace', () => {
  it('calls the backend reverse geocoding endpoint', () => {
    const { signal } = new AbortController();

    reversePlace({ lat: 41.65, lng: -0.88 }, { signal });

    expect(apiRequest).toHaveBeenCalledWith('/geocoding/reverse?lat=41.65&lng=-0.88', { signal });
  });
});

describe('autocompletePlaces', () => {
  it('calls the backend geocoding endpoint', () => {
    autocompletePlaces('Plaza del Pilar');

    expect(apiRequest).toHaveBeenCalledWith(
      '/geocoding/autocomplete?limit=5&text=Plaza+del+Pilar',
      {}
    );
  });
});
