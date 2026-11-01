import { act, renderHook } from '@testing-library/react';

import { useRouteNavigation } from './useRouteNavigation.js';

const route = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [-0.89, 41.65],
      [-0.888, 41.65],
    ],
  },
  duration: 120,
  steps: [],
};
const at = (latitude, longitude) => ({ coords: { latitude, longitude } });

describe('useRouteNavigation', () => {
  const originalGeolocation = navigator.geolocation;
  const originalSecure = window.isSecureContext;
  let onPosition;
  let onError;
  let watchPosition;
  let clearWatch;

  beforeEach(() => {
    watchPosition = jest.fn((success, error) => {
      onPosition = success;
      onError = error;
      return 7;
    });
    clearWatch = jest.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecure,
    });
    delete navigator.wakeLock;
  });

  it('does not use the GPS until the user starts the route', () => {
    const { result } = renderHook(() => useRouteNavigation(route));

    expect(result.current.isActive).toBe(false);
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('follows the position while active and stops when asked', () => {
    const { result } = renderHook(() => useRouteNavigation(route));

    act(() => result.current.start());
    expect(result.current.isActive).toBe(true);
    expect(result.current.progress).toBeNull();
    expect(watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true });

    act(() => onPosition(at(41.65, -0.889)));
    expect(result.current.position).toMatchObject({ lat: 41.65, lng: -0.889 });
    expect(result.current.progress.alongM).toBeGreaterThan(50);

    act(() => result.current.stop());
    expect(result.current.isActive).toBe(false);
    expect(result.current.position).toBeNull();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('remembers the progress between positions', () => {
    const { result } = renderHook(() => useRouteNavigation(route));
    act(() => result.current.start());

    act(() => onPosition(at(41.65, -0.889)));
    const { alongM } = result.current.progress;
    act(() => onPosition(at(41.651, -0.889)));

    expect(result.current.progress.isOffRoute).toBe(true);
    expect(result.current.progress.alongM).toBe(alongM);
  });

  it('ends when the route changes', () => {
    const { result, rerender } = renderHook((current) => useRouteNavigation(current), {
      initialProps: route,
    });
    act(() => result.current.start());

    rerender({ ...route });

    expect(result.current.isActive).toBe(false);
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('stops listening when it is unmounted', () => {
    const { result, unmount } = renderHook(() => useRouteNavigation(route));
    act(() => result.current.start());

    unmount();

    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('ignores invalid positions', () => {
    const { result } = renderHook(() => useRouteNavigation(route));
    act(() => result.current.start());

    act(() => onPosition(at(Number.NaN, -0.889)));

    expect(result.current.position).toBeNull();
  });

  it('ends with an explanation when the permission is denied', () => {
    const { result } = renderHook(() => useRouteNavigation(route));
    act(() => result.current.start());

    act(() => onError({ code: 1 }));

    expect(result.current.isActive).toBe(false);
    expect(result.current.errorMessage).toContain('Se ha denegado');
  });

  it('keeps going when the signal is lost for a while', () => {
    const { result } = renderHook(() => useRouteNavigation(route));
    act(() => result.current.start());

    act(() => onError({ code: 3 }));
    expect(result.current.isActive).toBe(true);
    expect(result.current.signalLost).toBe(true);

    act(() => onPosition(at(41.65, -0.889)));
    expect(result.current.signalLost).toBe(false);
  });

  it('explains why it cannot start without HTTPS or GPS', () => {
    const { result } = renderHook(() => useRouteNavigation(route));

    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    act(() => result.current.start());
    expect(result.current.isActive).toBe(false);
    expect(result.current.errorMessage).toContain('HTTPS');

    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    act(() => result.current.start());
    expect(result.current.isActive).toBe(false);
    expect(result.current.errorMessage).toContain('no permite');
  });

  it('keeps the screen on while active, if the browser allows it', async () => {
    const release = jest.fn();
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: jest.fn().mockResolvedValue({ release }) },
    });
    const { result } = renderHook(() => useRouteNavigation(route));

    await act(async () => result.current.start());
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');

    await act(async () => result.current.stop());
    expect(release).toHaveBeenCalled();
  });

  it('does not fail when the browser refuses to keep the screen on', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    const { result } = renderHook(() => useRouteNavigation(route));

    await act(async () => result.current.start());

    expect(result.current.isActive).toBe(true);
  });
});
