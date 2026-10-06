import { act, renderHook, waitFor } from '@testing-library/react';

import { getFastestRoute } from '../../services/api/routesApi.js';
import { useFastestRoute } from './useFastestRoute.js';

jest.mock('../../services/api/routesApi.js', () => ({
  getFastestRoute: jest.fn(),
}));

describe('useFastestRoute', () => {
  const origin = { lat: 41.6488, lng: -0.8891 };
  const destination = { lat: 41.656, lng: -0.878 };
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

  beforeEach(() => getFastestRoute.mockReset());

  it('stores the route while exposing the loading state', async () => {
    let resolveRequest;
    getFastestRoute.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { result } = renderHook(() => useFastestRoute());

    let pending;
    act(() => {
      pending = result.current.calculateRoute(origin, destination);
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.route).toBeNull();

    await act(async () => {
      resolveRequest(route);
      await pending;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.route).toEqual(route);
    expect(getFastestRoute).toHaveBeenCalledWith(
      { origin, destination },
      { signal: expect.any(AbortSignal) }
    );
  });

  it('stores a comprehensible request error', async () => {
    getFastestRoute.mockRejectedValue(
      new Error('No se ha podido calcular la ruta. Inténtalo de nuevo.')
    );
    const { result } = renderHook(() => useFastestRoute());

    await act(async () => {
      await result.current.calculateRoute(origin, destination);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.route).toBeNull();
    expect(result.current.errorMessage).toContain('No se ha podido calcular');
  });

  it('cancels and clears an obsolete route request', async () => {
    getFastestRoute.mockImplementation(
      (_points, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    );
    const { result } = renderHook(() => useFastestRoute());

    act(() => {
      result.current.calculateRoute(origin, destination);
    });
    act(() => {
      result.current.clearRoute();
    });

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.route).toBeNull();
    expect(result.current.errorMessage).toBe('');
  });
});
