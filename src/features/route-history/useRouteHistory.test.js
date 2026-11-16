import { act, renderHook, waitFor } from '@testing-library/react';

import {
  addRouteFavorite,
  clearRecentPlaces,
  listRecentPlaces,
  listRouteFavorites,
  recordRecentPlaces,
  removeRouteFavorite,
} from '../../services/api/routeHistoryApi.js';
import { placeKey, useRouteHistory } from './useRouteHistory.js';

jest.mock('../../services/api/routeHistoryApi.js', () => ({
  addRouteFavorite: jest.fn(),
  clearRecentPlaces: jest.fn(),
  listRecentPlaces: jest.fn(),
  listRouteFavorites: jest.fn(),
  recordRecentPlaces: jest.fn(),
  removeRouteFavorite: jest.fn(),
}));

const point = (lat, label = null, source = 'search') => ({ lat, lng: -0.88, label, source });
const place = (id, lat) => ({ id, lat, lng: -0.88, label: `Lugar ${id}`, usedAt: '2026-11-16' });

describe('useRouteHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRecentPlaces.mockResolvedValue([place(1, 41.6)]);
    listRouteFavorites.mockResolvedValue([]);
  });

  it('loads the recent places and the favourites of the user', async () => {
    const { result } = renderHook(() => useRouteHistory());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.places).toEqual([place(1, 41.6)]);
    expect(result.current.favorites).toEqual([]);
  });

  it('records the places of a route, without «Mi ubicación», and keeps the list the backend returns', async () => {
    recordRecentPlaces.mockResolvedValue([place(2, 41.65), place(1, 41.6)]);
    const { result } = renderHook(() => useRouteHistory());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const device = point(41.62, 'Mi ubicación', 'device');
    await act(() => result.current.recordPlaces([device, point(41.65, 'Plaza')]));

    expect(recordRecentPlaces).toHaveBeenCalledWith([point(41.65, 'Plaza')]);
    expect(result.current.places.map(({ id }) => id)).toEqual([2, 1]);
  });

  it('records nothing with only «Mi ubicación» and keeps the list when the record fails', async () => {
    recordRecentPlaces.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRouteHistory());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.recordPlaces([point(41.62, 'Mi ubicación', 'device'), null]));
    expect(recordRecentPlaces).not.toHaveBeenCalled();

    await act(() => result.current.recordPlaces([point(41.7)]));
    expect(result.current.places).toEqual([place(1, 41.6)]);
  });

  it('marks, removes favourites and clears the recent places', async () => {
    const trip = { origin: point(41.600001), destination: point(41.65) };
    addRouteFavorite.mockResolvedValue({ id: 5, name: 'Casa', ...trip });
    removeRouteFavorite.mockResolvedValue();
    clearRecentPlaces.mockResolvedValue();
    const { result } = renderHook(() => useRouteHistory());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.addFavorite(trip, 'Casa'));
    expect(result.current.isFavorite(trip)).toBe(true);

    await act(() => result.current.removeFavorite(5));
    expect(result.current.isFavorite(trip)).toBe(false);

    await act(() => result.current.clearPlaces());
    expect(result.current.places).toEqual([]);
  });

  it('tells when the lists cannot be loaded', async () => {
    listRecentPlaces.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRouteHistory());

    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('compares places rounded to about a metre', () => {
    expect(placeKey({ lat: 41.6000001, lng: -0.88 })).toBe(placeKey({ lat: 41.6, lng: -0.880001 }));
  });
});
