import { act, renderHook, waitFor } from '@testing-library/react';

import {
  getRoutePreferences,
  saveRoutePreferences,
} from '../../services/api/routePreferencesApi.js';
import { useRoutePreferences } from './useRoutePreferences.js';

jest.mock('../../services/api/routePreferencesApi.js', () => ({
  ...jest.requireActual('../../services/api/routePreferencesApi.js'),
  getRoutePreferences: jest.fn(),
  saveRoutePreferences: jest.fn(),
}));

const SAVED = { sunShade: 'sun', avoidWind: false, preferParks: true, extraMinutes: 10 };
const DEFAULTS = { sunShade: 'any', avoidWind: false, preferParks: false, extraMinutes: 5 };

describe('useRoutePreferences (PBI-18)', () => {
  beforeEach(() => {
    getRoutePreferences.mockReset().mockResolvedValue(SAVED);
    saveRoutePreferences.mockReset().mockImplementation(async (preferences) => preferences);
  });

  it('starts with the defaults and then uses the preferences of the account', async () => {
    const { result } = renderHook(() => useRoutePreferences());

    expect(result.current).toMatchObject({ preferences: DEFAULTS, isLoading: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toEqual(SAVED);
  });

  it('saves every change at once, and only the latest one counts', async () => {
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.change({ avoidWind: true });
    });
    act(() => {
      result.current.change({ extraMinutes: 15 });
    });

    expect(result.current.preferences).toEqual({ ...SAVED, avoidWind: true, extraMinutes: 15 });
    expect(saveRoutePreferences).toHaveBeenCalledTimes(2);
    const [first, second] = saveRoutePreferences.mock.calls;
    // The second save cancels the first one.
    expect(first[1].signal.aborted).toBe(true);
    expect(second[0]).toEqual({ ...SAVED, avoidWind: true, extraMinutes: 15 });
    await waitFor(() => expect(result.current.saveError).toBe(''));
  });

  it('keeps an answer chosen while loading and saves it', async () => {
    let resolveLoad;
    getRoutePreferences.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      })
    );
    const { result } = renderHook(() => useRoutePreferences());

    act(() => {
      result.current.change({ sunShade: 'shade' });
    });
    await act(async () => resolveLoad(SAVED));

    expect(result.current.preferences).toEqual({ ...DEFAULTS, sunShade: 'shade' });
    expect(saveRoutePreferences).toHaveBeenCalledWith(
      { ...DEFAULTS, sunShade: 'shade' },
      expect.anything()
    );
  });

  it('shows the error of a failed save and keeps the change', async () => {
    saveRoutePreferences.mockRejectedValue(new Error('No se han podido guardar tus preferencias.'));
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.change({ preferParks: false });
    });

    await waitFor(() =>
      expect(result.current.saveError).toBe('No se han podido guardar tus preferencias.')
    );
    expect(result.current.preferences.preferParks).toBe(false);
  });

  it('without the backend uses the defaults and never saves them', async () => {
    getRoutePreferences.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.loadFailed).toBe(true));

    act(() => {
      result.current.change({ sunShade: 'shade' });
    });

    expect(result.current.preferences.sunShade).toBe('shade');
    expect(saveRoutePreferences).not.toHaveBeenCalled();
    await expect(result.current.replace(SAVED)).rejects.toThrow('no se pueden guardar');
  });

  it('replaces every answer and waits for the save (the assistant)', async () => {
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.replace(DEFAULTS);
    });

    expect(result.current.preferences).toEqual(DEFAULTS);
    expect(saveRoutePreferences).toHaveBeenCalledWith(DEFAULTS, expect.anything());

    saveRoutePreferences.mockRejectedValue(new Error('No se han podido guardar tus preferencias.'));
    await act(async () => {
      await expect(result.current.replace(SAVED)).rejects.toThrow('No se han podido guardar');
    });
  });
});
