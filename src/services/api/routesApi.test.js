import { getFastestRoute, getShadedRouteComparison } from './routesApi.js';

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
    [502, 'No se ha podido calcular'],
  ])('shows a route-specific message for status %s', async (status, message) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
    await expect(getFastestRoute({ origin, destination })).rejects.toThrow(message);
  });

  it('posts the solar instant and validates a shaded route comparison', async () => {
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
      shaded: environmentalRoute,
      additionalDurationSeconds: 120,
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comparison }),
    });

    await expect(
      getShadedRouteComparison({
        origin,
        destination,
        date: '2026-06-21',
        time: '14:00',
        timeZone: 'Europe/Madrid',
      })
    ).resolves.toEqual(comparison);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      date: '2026-06-21',
      time: '14:00',
      timeZone: 'Europe/Madrid',
    });
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
          shaded: null,
          additionalDurationSeconds: null,
        },
      }),
    });

    await expect(
      getShadedRouteComparison({ origin, destination, date: '2026-06-21', time: '14:00' })
    ).rejects.toThrow('comparación no válida');
  });
});
