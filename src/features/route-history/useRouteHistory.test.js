import { act, renderHook, waitFor } from '@testing-library/react';

import {
  addRouteFavorite,
  clearRouteHistory,
  listRouteFavorites,
  listRouteHistory,
  recordRouteSearch,
  removeRouteFavorite,
} from '../../services/api/routeHistoryApi.js';
import { useRouteHistory } from './useRouteHistory.js';

jest.mock('../../services/api/routeHistoryApi.js', () => ({
  addRouteFavorite: jest.fn(),
  clearRouteHistory: jest.fn(),
  listRouteFavorites: jest.fn(),
  listRouteHistory: jest.fn(),
  recordRouteSearch: jest.fn(),
  removeRouteFavorite: jest.fn(),
}));

const point = (lat, label = null) => ({ lat, lng: -0.88, label });
const search = (id, lat) => ({
  id,
  origin: point(lat),
  destination: point(41.65),
  searchedAt: '2026-11-14T20:00:00.000Z',
});

describe('useRouteHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listRouteHistory.mockResolvedValue([search(1, 41.6)]);
    listRouteFavorites.mockResolvedValue([]);
  });

  it('loads the history and the favourites of the user', async () => {
    const { result } = renderHook(() => useRouteHistory());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.searches).toEqual([search(1, 41.6)]);
    expect(result.current.favorites).toEqual([]);
  });

  it('puts a recorded search first without repeating it, and ignores a failed record', async () => {
    recordRouteSearch.mockResolvedValueOnce(search(1, 41.6)).mockRejectedValueOnce(new Error('x'));
    listRouteHistory.mockResolvedValue([search(2, 41.61), search(1, 41.6)]);
    const { result } = renderHook(() => useRouteHistory());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() =>
      result.current.recordSearch({ origin: point(41.6), destination: point(41.65) })
    );
    expect(result.current.searches.map(({ id }) => id)).toEqual([1, 2]);

    await act(() =>
      result.current.recordSearch({ origin: point(41.7), destination: point(41.65) })
    );
    expect(result.current.searches.map(({ id }) => id)).toEqual([1, 2]);
  });

  it('marks, removes favourites and clears the history', async () => {
    const trip = { origin: point(41.600001), destination: point(41.65) };
    addRouteFavorite.mockResolvedValue({ ...search(5, 41.6), name: 'Casa' });
    removeRouteFavorite.mockResolvedValue();
    clearRouteHistory.mockResolvedValue();
    const { result } = renderHook(() => useRouteHistory());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(() => result.current.addFavorite(trip, 'Casa'));
    expect(result.current.isFavorite(trip)).toBe(true);

    await act(() => result.current.removeFavorite(5));
    expect(result.current.isFavorite(trip)).toBe(false);

    await act(() => result.current.clearHistory());
    expect(result.current.searches).toEqual([]);
  });

  it('tells when the lists cannot be loaded', async () => {
    listRouteHistory.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRouteHistory());

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
