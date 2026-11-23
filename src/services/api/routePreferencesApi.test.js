import {
  DEFAULT_PREFERENCES,
  getRoutePreferences,
  isValidPreferences,
  saveRoutePreferences,
} from './routePreferencesApi.js';

const PREFERENCES = { sunShade: 'shade', avoidWind: true, preferParks: false, extraMinutes: 10 };
const respond = (body, status = 200) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('route preferences API (PBI-18)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('defaults to every answer indifferent and 5 minutes', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      sunShade: 'any',
      avoidWind: false,
      preferParks: false,
      extraMinutes: 5,
    });
  });

  it('gets the preferences of the account', async () => {
    global.fetch = respond({ preferences: { ...PREFERENCES, updatedAt: 'x' } });

    await expect(getRoutePreferences()).resolves.toEqual(PREFERENCES);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/route-preferences$/);
  });

  it('saves every answer with PUT and returns what was saved', async () => {
    global.fetch = respond({ preferences: PREFERENCES });

    await expect(saveRoutePreferences({ ...PREFERENCES, extra: 1 })).resolves.toEqual(PREFERENCES);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/route-preferences$/);
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(PREFERENCES);
  });

  it('rejects an answer that is not one of the options', async () => {
    global.fetch = respond({ preferences: { ...PREFERENCES, extraMinutes: 25 } });
    await expect(getRoutePreferences()).rejects.toThrow('preferencias no válidas');
    global.fetch = respond({ preferences: { ...PREFERENCES, sunShade: 'both' } });
    await expect(saveRoutePreferences(PREFERENCES)).rejects.toThrow('preferencias no válidas');
  });

  it('says clearly when they cannot be loaded or saved', async () => {
    global.fetch = respond({}, 500);
    await expect(getRoutePreferences()).rejects.toThrow(
      'No se han podido cargar tus preferencias.'
    );
    await expect(saveRoutePreferences(PREFERENCES)).rejects.toThrow(
      'No se han podido guardar tus preferencias.'
    );
  });

  it.each([
    [PREFERENCES, true],
    [{ ...PREFERENCES, avoidWind: 'yes' }, false],
    [{ ...PREFERENCES, preferParks: undefined }, false],
    [null, false],
  ])('%j is valid: %s', (preferences, valid) => {
    expect(isValidPreferences(preferences)).toBe(valid);
  });
});
