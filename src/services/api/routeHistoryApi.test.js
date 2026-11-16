import {
  addRouteFavorite,
  clearRecentPlaces,
  listRecentPlaces,
  listRouteFavorites,
  recordRecentPlaces,
  removeRouteFavorite,
} from './routeHistoryApi.js';

const trip = {
  origin: { lat: 41.6572, lng: -0.88039, label: 'Plaza del Pilar', source: 'search' },
  destination: { lat: 41.65069, lng: -0.88005, source: 'map' },
};
const saved = {
  id: 1,
  origin: { lat: 41.6572, lng: -0.88039, label: 'Plaza del Pilar' },
  destination: { lat: 41.65069, lng: -0.88005, label: null },
};
const place = {
  id: 3,
  lat: 41.6572,
  lng: -0.88039,
  label: 'Plaza del Pilar',
  usedAt: '2026-11-16T20:00:00.000Z',
};
const favorite = { ...saved, id: 2, name: 'Casa', createdAt: '2026-11-14T20:00:00.000Z' };
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

describe('routeHistoryApi', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists, records and clears the recent places, sending only the points and their names', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply(200, { places: [place] }))
      .mockResolvedValueOnce(reply(200, { places: [place] }))
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });

    await expect(listRecentPlaces()).resolves.toEqual([place]);
    await expect(recordRecentPlaces([trip.origin, trip.destination])).resolves.toEqual([place]);
    await expect(clearRecentPlaces()).resolves.toBeUndefined();

    const [listed, recorded, cleared] = global.fetch.mock.calls;
    expect(listed[0]).toMatch(/\/recent-places$/);
    expect(recorded[0]).toMatch(/\/recent-places$/);
    expect(recorded[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(recorded[1].body)).toEqual({
      places: [
        { lat: 41.6572, lng: -0.88039, label: 'Plaza del Pilar' },
        { lat: 41.65069, lng: -0.88005, label: null },
      ],
    });
    expect(cleared[0]).toMatch(/\/recent-places$/);
    expect(cleared[1]).toMatchObject({ method: 'DELETE' });
  });

  it('lists, adds and removes favourites; one already gone counts as removed', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply(200, { favorites: [favorite] }))
      .mockResolvedValueOnce(reply(201, { favorite }))
      .mockResolvedValueOnce(reply(404, { error: { message: 'No existe' } }));

    await expect(listRouteFavorites()).resolves.toEqual([favorite]);
    await expect(addRouteFavorite(trip, 'Casa')).resolves.toEqual(favorite);
    await expect(removeRouteFavorite(2)).resolves.toBeUndefined();
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).name).toBe('Casa');
    expect(global.fetch.mock.calls[2][0]).toMatch(/\/route-favorites\/2$/);
  });

  it('explains a repeated favourite or the maximum reached', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply(409, { error: { message: 'Repetido' } }));

    await expect(addRouteFavorite(trip)).rejects.toThrow('ya está en tus favoritos');
  });

  it('rejects trips that are not valid', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply(200, { places: [{ ...place, lat: 'x' }] }))
      .mockResolvedValueOnce(reply(200, { places: [{ ...place, usedAt: null }] }))
      .mockResolvedValueOnce(reply(200, {}))
      .mockResolvedValueOnce(reply(200, { favorites: [{ ...favorite, name: '' }] }));

    await expect(listRecentPlaces()).rejects.toThrow('lugar no válido');
    await expect(listRecentPlaces()).rejects.toThrow('lugar no válido');
    await expect(recordRecentPlaces([trip.origin])).rejects.toThrow('lugar no válido');
    await expect(listRouteFavorites()).rejects.toThrow('no válido');
  });
});
