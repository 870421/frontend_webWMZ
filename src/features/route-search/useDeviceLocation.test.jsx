import { act, renderHook } from '@testing-library/react';

import { createDevicePoint, useDeviceLocation } from './useDeviceLocation.js';

describe('createDevicePoint', () => {
  it('creates an origin point from a geolocation position', () => {
    expect(
      createDevicePoint({
        coords: {
          latitude: 41.65,
          longitude: -0.89
        }
      })
    ).toEqual({
      lat: 41.65,
      lng: -0.89,
      label: 'Current location',
      source: 'device'
    });
  });
});

describe('useDeviceLocation', () => {
  const originalGeolocation = navigator.geolocation;
  const originalIsSecureContext = window.isSecureContext;

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalIsSecureContext
    });
  });

  it('explains when geolocation is blocked by an insecure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated: jest.fn() }));

    act(() => result.current.requestCurrentLocation());

    expect(result.current.geolocation.status).toBe('error');
    expect(result.current.geolocation.errorMessage).toBe(
      'Location access requires HTTPS or localhost. Open the app on localhost or use HTTPS.'
    );
  });

  it('handles unsupported browsers', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated: jest.fn() }));

    act(() => result.current.requestCurrentLocation());

    expect(result.current.geolocation.status).toBe('unsupported');
    expect(result.current.geolocation.errorMessage).toBe(
      'Your browser does not support location access.'
    );
  });

  it('sets success state and returns a device point', () => {
    const onLocated = jest.fn();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((onSuccess) =>
          onSuccess({
            coords: {
              latitude: 41.65,
              longitude: -0.89
            }
          })
        )
      }
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated }));

    act(() => result.current.requestCurrentLocation('destination'));

    expect(onLocated).toHaveBeenCalledWith('destination', {
      lat: 41.65,
      lng: -0.89,
      label: 'Current location',
      source: 'device'
    });
    expect(result.current.geolocation.status).toBe('success');
    expect(result.current.geolocation.pointType).toBe('destination');
  });

  it('falls back to lower accuracy when precise location is unavailable', () => {
    const onLocated = jest.fn();
    const unavailableError = {
      code: 2
    };
    const getCurrentPosition = jest
      .fn()
      .mockImplementationOnce((_onSuccess, onError) => onError(unavailableError))
      .mockImplementationOnce((onSuccess) =>
        onSuccess({
          coords: {
            latitude: 41.67,
            longitude: -0.88
          }
        })
      );

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition
      }
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated }));

    act(() => result.current.requestCurrentLocation('origin'));

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getCurrentPosition.mock.calls[1][2]).toMatchObject({
      enableHighAccuracy: false
    });
    expect(onLocated).toHaveBeenCalledWith('origin', {
      lat: 41.67,
      lng: -0.88,
      label: 'Current location',
      source: 'device'
    });
    expect(result.current.geolocation.status).toBe('success');
  });

  it('shows a useful unavailable message when fallback also fails', () => {
    const unavailableError = {
      code: 2
    };

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((_onSuccess, onError) => onError(unavailableError))
      }
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated: jest.fn() }));

    act(() => result.current.requestCurrentLocation());

    expect(result.current.geolocation.status).toBe('error');
    expect(result.current.geolocation.errorMessage).toBe(
      'Your current location is unavailable. Check that location services are enabled for your browser and operating system.'
    );
  });

  it('handles permission denial', () => {
    const permissionError = {
      code: 1,
      PERMISSION_DENIED: 1
    };

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((_onSuccess, onError) => onError(permissionError))
      }
    });

    const { result } = renderHook(() => useDeviceLocation({ onLocated: jest.fn() }));

    act(() => result.current.requestCurrentLocation());

    expect(result.current.geolocation.status).toBe('denied');
    expect(result.current.geolocation.errorMessage).toBe('Location permission was denied.');
  });

  it('reports timeout after the fallback also times out', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: jest.fn((_success, fail) => fail({ code: 3 }))
    } });
    const { result } = renderHook(() => useDeviceLocation({ onLocated: jest.fn() }));
    act(() => result.current.requestCurrentLocation());
    expect(result.current.geolocation.errorMessage).toBe('Location request timed out.');
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('ignores callbacks after cancellation and unmount', () => {
    let success;
    let fail;
    const onLocated = jest.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: jest.fn((onSuccess, onError) => { success = onSuccess; fail = onError; })
    } });
    const { result, unmount } = renderHook(() => useDeviceLocation({ onLocated }));
    act(() => result.current.requestCurrentLocation());
    act(() => result.current.clearGeolocationMessage());
    act(() => { success({ coords: { latitude: 41, longitude: -1 } }); fail({ code: 2 }); });
    expect(onLocated).not.toHaveBeenCalled();
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    act(() => result.current.requestCurrentLocation());
    unmount();
    act(() => success({ coords: { latitude: 41, longitude: -1 } }));
    expect(onLocated).not.toHaveBeenCalled();
  });
});
