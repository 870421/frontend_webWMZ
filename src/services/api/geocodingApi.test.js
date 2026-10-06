import { autocompletePlaces } from './geocodingApi.js';
import { apiRequest } from './client.js';

jest.mock('./client.js', () => ({
  apiRequest: jest.fn(),
}));

describe('autocompletePlaces', () => {
  it('calls the backend geocoding endpoint', () => {
    autocompletePlaces('Plaza del Pilar');

    expect(apiRequest).toHaveBeenCalledWith(
      '/geocoding/autocomplete?limit=5&text=Plaza+del+Pilar',
      {}
    );
  });
});
