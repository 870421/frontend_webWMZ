import { getFastestRoute, getPreferredRouteComparison } from './routesApi.js';

const answers = (overrides = {}) => ({
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
  ...overrides,
});

describe('getFastestRoute', () => {
  const originalFetch = global.fetch;
  const origin = { lat: 41.6488, lng: -0.8891, label: 'Origen', source: 'map' };
  const destination = { lat: 41.656, lng: -0.878, label: 'Destino', source: 'search' };
  const route = {
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.8891, 41.6488],
        [-0.878, 41.656],
      ],
    },
    distance: 1250.4,
    duration: 930.2,
  };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts only the selected coordinates and returns the route', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ route }),
    });
    const { signal } = new AbortController();

    await expect(getFastestRoute({ origin, destination }, { signal })).resolves.toEqual(route);
    expect(global.fetch).toHaveBeenCalledWith('/api/routes/fastest', {
      method: 'POST',
      signal,
      body: JSON.stringify({
        origin: { lat: 41.6488, lng: -0.8891 },
        destination: { lat: 41.656, lng: -0.878 },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it.each([
    null,
    {},
    { route: {} },
    { route: { ...route, geometry: { type: 'Point', coordinates: [-0.8891, 41.6488] } } },
    { route: { ...route, distance: -1 } },
    { route: { ...route, duration: '930.2' } },
  ])('rejects an invalid route response', async (body) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body });
    await expect(getFastestRoute({ origin, destination })).rejects.toThrow(
      'El servidor ha devuelto una ruta no válida'
    );
  });

  it.each([
    [400, 'no son válidos'],
    [429, 'está ocupado'],
    [503, 'no está configurado'],
    [504, 'ha tardado demasiado'],
    [502, 'OpenRouteService no ha podido responder'],
  ])('shows a route-specific message for status %s', async (status, message) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
    await expect(getFastestRoute({ origin, destination })).rejects.toThrow(message);
  });

  it('posts the solar instant and the answers and validates the comparison (PBI-18)', async () => {
    const environmentalRoute = {
      ...route,
      exposure: {
        status: 'available',
        shadePercentage: 60,
        sunPercentage: 40,
      },
    };
    const comparison = {
      status: 'selected',
      fastest: {
        ...environmentalRoute,
        exposure: { ...environmentalRoute.exposure, shadePercentage: 20, sunPercentage: 80 },
      },
      selected: environmentalRoute,
      additionalDurationSeconds: 120,
      shadeChangePercentagePoints: 40,
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comparison }),
    });

    await expect(
      getPreferredRouteComparison({
        origin,
        destination,
        date: '2026-06-21',
        time: '14:00',
        timeZone: 'Europe/Madrid',
        preferences: answers({ sunShade: 'shade', extraMinutes: 10 }),
      })
    ).resolves.toEqual({
      ...comparison,
      // The chosen route takes the place of the shaded one in the app.
      shaded: environmentalRoute,
      shadeImprovementPercentagePoints: 40,
      windChangePoints: null,
      greenChangePercentagePoints: null,
    });
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/routes\/preferred$/);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      date: '2026-06-21',
      time: '14:00',
      timeZone: 'Europe/Madrid',
      preferences: answers({ sunShade: 'shade', extraMinutes: 10 }),
    });
  });

  it('accepts the wind exposure of each route and rejects an impossible one (PBI-8.2)', async () => {
    const windyRoute = (exposure) => ({
      ...route,
      exposure: { status: 'unavailable', shadePercentage: null, sunPercentage: null },
      windExposure: { status: 'available', exposure },
    });
    const reply = (fastest) => ({
      ok: true,
      json: async () => ({
        comparison: {
          status: 'selected',
          fastest,
          selected: windyRoute(30),
          additionalDurationSeconds: 60,
          shadeChangePercentagePoints: null,
          windChangePoints: -60,
        },
      }),
    });
    const request = {
      origin,
      destination,
      date: '2026-11-06',
      time: '23:00',
      preferences: answers({ avoidWind: true }),
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply(windyRoute(90)))
      .mockResolvedValueOnce(reply(windyRoute(140)));

    await expect(getPreferredRouteComparison(request)).resolves.toMatchObject({
      shaded: { windExposure: { exposure: 30 } },
      windChangePoints: -60,
    });
    await expect(getPreferredRouteComparison(request)).rejects.toThrow('comparación no válida');
  });

  it('rejects invented or out-of-range shaded metrics', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        comparison: {
          status: 'selected',
          fastest: {
            ...route,
            exposure: { status: 'available', shadePercentage: 120, sunPercentage: -20 },
          },
          selected: null,
          additionalDurationSeconds: null,
        },
      }),
    });

    await expect(
      getPreferredRouteComparison({
        origin,
        destination,
        date: '2026-06-21',
        time: '14:00',
        preferences: answers({ sunShade: 'shade' }),
      })
    ).rejects.toThrow('comparación no válida');
  });
});

describe('the route of the answers with only the fastest route (PBI-18)', () => {
  it('accepts fastest_only, without shade data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        comparison: {
          status: 'fastest_only',
          fastest: {
            geometry: {
              type: 'LineString',
              coordinates: [
                [-0.88, 41.65],
                [-0.87, 41.66],
              ],
            },
            distance: 900,
            duration: 600,
          },
          selected: null,
          additionalDurationSeconds: null,
          strategy: { maximumExtraMinutes: 5 },
        },
      }),
    });

    await expect(
      getPreferredRouteComparison({
        origin: { lat: 41.65, lng: -0.88 },
        destination: { lat: 41.66, lng: -0.87 },
        preferences: answers(),
      })
    ).resolves.toMatchObject({ status: 'fastest_only', shaded: null });
  });
});

describe('green percentage in the weighted comparison (PBI-10 phase B)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  const geometry = {
    type: 'LineString',
    coordinates: [
      [-0.8891, 41.6488],
      [-0.878, 41.656],
    ],
  };
  const greenRoute = (greenPercentage) => ({
    geometry,
    distance: 1000,
    duration: 600,
    exposure: { status: 'unavailable', shadePercentage: null, sunPercentage: null },
    vegetation: { status: 'available', greenPercentage },
  });
  const request = {
    origin: { lat: 41.6488, lng: -0.8891 },
    destination: { lat: 41.656, lng: -0.878 },
    date: '2026-11-12',
    time: '23:00',
    preferences: answers({ preferParks: true }),
  };
  const reply = (selected, greenChangePercentagePoints) => ({
    ok: true,
    json: async () => ({
      comparison: {
        status: 'selected',
        fastest: greenRoute(5),
        selected,
        additionalDurationSeconds: 60,
        greenChangePercentagePoints,
      },
    }),
  });

  it('keeps the green of each route and its change, and sends the answer about parks', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply(greenRoute(80), 75));

    await expect(getPreferredRouteComparison(request)).resolves.toMatchObject({
      shaded: { vegetation: { greenPercentage: 80 } },
      greenChangePercentagePoints: 75,
    });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).preferences).toEqual(request.preferences);
  });

  it('rejects an impossible green percentage', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply(greenRoute(130), 125));

    await expect(getPreferredRouteComparison(request)).rejects.toThrow('comparación no válida');
  });
});
