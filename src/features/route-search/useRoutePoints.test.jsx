import { act, renderHook } from '@testing-library/react';

import { reversePlace } from '../../services/api/geocodingApi.js';
import { formatPointLabel, useRoutePoints } from './useRoutePoints.js';

jest.mock('../../services/api/geocodingApi.js', () => ({
  reversePlace: jest.fn(),
}));

describe('useRoutePoints', () => {
  beforeEach(() => {
    reversePlace.mockReset();
    reversePlace.mockResolvedValue({ place: null });
  });

  describe('naming points chosen on the map', () => {
    const mapPoint = { lat: 41.65, lng: -0.89, source: 'map' };
    const place = (label) => ({ place: { label } });
    let answer;

    beforeEach(() => {
      reversePlace.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            answer = { resolve, reject };
          })
      );
    });

    it('shows the coordinates at once and then the name', async () => {
      const { result } = renderHook(() => useRoutePoints());

      act(() => result.current.selectPoint(mapPoint));

      expect(result.current.origin).toEqual(mapPoint);
      expect(result.current.originInput).toBe('41.65000, -0.89000');
      expect(reversePlace).toHaveBeenCalledWith(mapPoint, { signal: expect.any(AbortSignal) });

      await act(async () => answer.resolve(place('Calle Mayor 1, Zaragoza, Spain')));

      expect(result.current.originInput).toBe('Calle Mayor 1, Zaragoza, Spain');
      expect(result.current.origin).toEqual({
        ...mapPoint,
        label: 'Calle Mayor 1, Zaragoza, Spain',
      });
      expect(result.current.lastSelectedPoint).toBe(result.current.origin);
    });

    it.each([
      ['there is no name', (a) => a.resolve({ place: null })],
      ['the request fails', (a) => a.reject(new Error('down'))],
    ])('keeps the coordinates when %s', async (_case, finish) => {
      const { result } = renderHook(() => useRoutePoints());

      act(() => result.current.selectPoint(mapPoint));
      await act(async () => finish(answer));

      expect(result.current.origin).toEqual(mapPoint);
      expect(result.current.originInput).toBe('41.65000, -0.89000');
    });

    it('ignores a late name if the user has already changed the point', async () => {
      const { result } = renderHook(() => useRoutePoints());

      act(() => result.current.selectPoint(mapPoint));
      act(() => result.current.editPoint('origin', 'Pil'));
      await act(async () => answer.resolve(place('Calle Mayor 1')));

      expect(result.current.origin).toBeNull();
      expect(result.current.originInput).toBe('Pil');
    });

    it('cancels the previous request when the same point is chosen again', () => {
      const { result } = renderHook(() => useRoutePoints());

      act(() => result.current.selectPoint(mapPoint));
      const firstSignal = reversePlace.mock.calls[0][1].signal;
      act(() => result.current.setActivePoint('origin'));
      act(() => result.current.selectPoint({ ...mapPoint, lat: 41.66 }));

      expect(firstSignal.aborted).toBe(true);
    });

    it('does not ask for the name of a point outside Zaragoza, nor of a searched place', () => {
      const { result } = renderHook(() => useRoutePoints());

      act(() => result.current.selectPoint({ lat: 40.4, lng: -3.7, source: 'map' }));
      act(() =>
        result.current.setPoint('origin', { ...mapPoint, label: 'Pilar', source: 'search' })
      );

      expect(reversePlace).not.toHaveBeenCalled();
    });
  });

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
