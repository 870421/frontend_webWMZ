import {
  addRouteFavorite,
  clearRouteHistory,
  listRouteFavorites,
  listRouteHistory,
  recordRouteSearch,
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
const search = { ...saved, searchedAt: '2026-11-14T20:00:00.000Z' };
const favorite = { ...saved, id: 2, name: 'Casa', createdAt: '2026-11-14T20:00:00.000Z' };
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

describe('routeHistoryApi', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists, records and clears the history, sending only the points and their names', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply(200, { searches: [search] }))
      .mockResolvedValueOnce(reply(201, { search }))
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });

    await expect(listRouteHistory()).resolves.toEqual([search]);
    await expect(recordRouteSearch(trip)).resolves.toEqual(search);
    await expect(clearRouteHistory()).resolves.toBeUndefined();

    const [, recorded, cleared] = global.fetch.mock.calls;
    expect(recorded[0]).toMatch(/\/route-history$/);
    expect(JSON.parse(recorded[1].body)).toEqual({
      origin: { lat: 41.6572, lng: -0.88039, label: 'Plaza del Pilar' },
      destination: { lat: 41.65069, lng: -0.88005, label: null },
    });
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
      .mockResolvedValueOnce(reply(200, { searches: [{ ...search, origin: { lat: 'x' } }] }))
      .mockResolvedValueOnce(reply(200, { favorites: [{ ...favorite, name: '' }] }));

    await expect(listRouteHistory()).rejects.toThrow('no válido');
    await expect(listRouteFavorites()).rejects.toThrow('no válido');
  });
});
