import { act, renderHook } from '@testing-library/react';

import { formatPointLabel, useRoutePoints } from './useRoutePoints.js';

describe('useRoutePoints', () => {
  it('rejects points outside Zaragoza and clears the error on the next selection', () => {
    const { result } = renderHook(() => useRoutePoints());

    act(() => result.current.selectPoint({ lat: 40.4168, lng: -3.7038, source: 'search' }));

    expect(result.current.origin).toBeNull();
    expect(result.current.originInput).toBe('');
    expect(result.current.pointError).toContain('solo funciona dentro de Zaragoza');

    act(() => result.current.selectPoint({ lat: 41.65, lng: -0.89, source: 'map' }));

    expect(result.current.origin).toMatchObject({ lat: 41.65 });
    expect(result.current.pointError).toBe('');
  });

  it('clears the outside-Zaragoza error when editing or resetting', () => {
    const { result } = renderHook(() => useRoutePoints());
    const madrid = { lat: 40.4168, lng: -3.7038, source: 'search' };

    act(() => result.current.setPoint('origin', madrid));
    act(() => result.current.editPoint('origin', 'Pilar'));
    expect(result.current.pointError).toBe('');

    act(() => result.current.setPoint('origin', madrid));
    act(() => result.current.resetPoints());
    expect(result.current.pointError).toBe('');
  });

  it('sets origin first, then destination', () => {
    const { result } = renderHook(() => useRoutePoints());

    act(() => result.current.selectPoint({ lat: 41.65, lng: -0.89, source: 'map' }));
    act(() => result.current.selectPoint({ lat: 41.66, lng: -0.88, source: 'map' }));

    expect(result.current.origin).toMatchObject({ lat: 41.65, lng: -0.89 });
    expect(result.current.destination).toMatchObject({ lat: 41.66, lng: -0.88 });
    expect(result.current.activePoint).toBe('destination');
    expect(result.current.lastSelectedPoint).toMatchObject({ lat: 41.66, lng: -0.88 });
  });

  it('clears and resets selected points', () => {
    const { result } = renderHook(() => useRoutePoints());

    act(() => result.current.setPoint('origin', { lat: 41.65, lng: -0.89, source: 'map' }));
    act(() => result.current.setPoint('destination', { lat: 41.66, lng: -0.88, source: 'map' }));
    act(() => result.current.clearPoint('origin'));

    expect(result.current.origin).toBeNull();
    expect(result.current.destination).toMatchObject({ lat: 41.66, lng: -0.88 });
    expect(result.current.lastSelectedPoint).toMatchObject({ lat: 41.66, lng: -0.88 });
    expect(result.current.activePoint).toBe('origin');

    act(() => result.current.clearPoint('destination'));

    expect(result.current.destination).toBeNull();
    expect(result.current.lastSelectedPoint).toBeNull();

    act(() => result.current.resetPoints());

    expect(result.current.origin).toBeNull();
    expect(result.current.destination).toBeNull();
    expect(result.current.lastSelectedPoint).toBeNull();
    expect(result.current.activePoint).toBe('origin');
  });
});

describe('formatPointLabel', () => {
  it('formats labels and coordinates', () => {
    expect(formatPointLabel(null)).toBe('Sin seleccionar');
    expect(formatPointLabel({ lat: 41.648812, lng: -0.889085 })).toBe('41.64881, -0.88909');
    expect(formatPointLabel({ lat: 41.65, lng: -0.89, label: 'Ubicación actual' })).toBe(
      'Ubicación actual'
    );
  });
});
