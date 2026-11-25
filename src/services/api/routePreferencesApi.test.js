import {
  DEFAULT_PREFERENCES,
  getRoutePreferences,
  getWeatherSuggestion,
  isValidPreferences,
  saveRoutePreferences,
} from './routePreferencesApi.js';

const PREFERENCES = {
  sunShade: 'shade',
  avoidWind: true,
  preferParks: false,
  extraMinutes: 10,
  byWeather: false,
};
const respond = (body, status = 200) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('route preferences API (PBI-18, PBI-21)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('defaults to every answer indifferent, 5 minutes and «Según el tiempo de hoy» on', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      sunShade: 'any',
      avoidWind: false,
      preferParks: false,
      extraMinutes: 5,
      byWeather: true,
    });
  });

  it('gets the preferences of the account', async () => {
    global.fetch = respond({ preferences: { ...PREFERENCES, updatedAt: 'x' } });

    await expect(getRoutePreferences()).resolves.toEqual(PREFERENCES);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/route-preferences$/);
  });

  it('takes «Según el tiempo de hoy» as off when a backend before PBI-21 does not send it', async () => {
    const { byWeather, ...before } = PREFERENCES;
    global.fetch = respond({ preferences: before });
    await expect(getRoutePreferences()).resolves.toEqual({ ...before, byWeather: false });
    expect(byWeather).toBe(false);
  });

  it('saves every answer and «Según el tiempo de hoy» with PUT and returns what was saved', async () => {
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
    [{ ...PREFERENCES, byWeather: undefined }, true],
    [{ ...PREFERENCES, byWeather: 'yes' }, false],
    [{ ...PREFERENCES, avoidWind: 'yes' }, false],
    [{ ...PREFERENCES, preferParks: undefined }, false],
    [null, false],
  ])('%j is valid: %s', (preferences, valid) => {
    expect(isValidPreferences(preferences)).toBe(valid);
  });

  describe('getWeatherSuggestion (PBI-21)', () => {
    it('gets what the weather marks and why', async () => {
      global.fetch = respond({
        suggestion: {
          status: 'available',
          criterion: 'hot',
          answers: { sunShade: 'shade', avoidWind: false },
          message: 'Hace calor (sensación de 31 °C): he marcado «Sombra».',
          weather: { temperature: 30 },
        },
      });

      await expect(getWeatherSuggestion()).resolves.toEqual({
        status: 'available',
        answers: { sunShade: 'shade', avoidWind: false },
        message: 'Hace calor (sensación de 31 °C): he marcado «Sombra».',
      });
      expect(global.fetch.mock.calls[0][0]).toMatch(/\/route-preferences\/weather$/);
    });

    it('accepts no answers when there is no weather', async () => {
      global.fetch = respond({
        suggestion: { status: 'unavailable', answers: null, message: 'Sin tiempo.' },
      });
      await expect(getWeatherSuggestion()).resolves.toEqual({
        status: 'unavailable',
        answers: null,
        message: 'Sin tiempo.',
      });
    });

    it.each([
      ['an unknown status', { status: 'maybe', answers: null, message: 'x' }],
      [
        'answers that are not options',
        { status: 'available', answers: { sunShade: 'both', avoidWind: false }, message: 'x' },
      ],
      ['no message', { status: 'available', answers: { sunShade: 'sun', avoidWind: true } }],
    ])('rejects %s', async (_case, suggestion) => {
      global.fetch = respond({ suggestion });
      await expect(getWeatherSuggestion()).rejects.toThrow('respuesta del tiempo no válida');
    });

    it('says clearly when the weather cannot be asked for', async () => {
      global.fetch = respond({}, 502);
      await expect(getWeatherSuggestion()).rejects.toThrow(
        'No se ha podido consultar el tiempo de hoy.'
      );
    });
  });
});
