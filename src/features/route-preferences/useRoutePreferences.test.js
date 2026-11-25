import { act, renderHook, waitFor } from '@testing-library/react';

import {
  getRoutePreferences,
  getWeatherSuggestion,
  saveRoutePreferences,
} from '../../services/api/routePreferencesApi.js';
import { useRoutePreferences } from './useRoutePreferences.js';

jest.mock('../../services/api/routePreferencesApi.js', () => ({
  ...jest.requireActual('../../services/api/routePreferencesApi.js'),
  getRoutePreferences: jest.fn(),
  getWeatherSuggestion: jest.fn(),
  saveRoutePreferences: jest.fn(),
}));

const SAVED = {
  sunShade: 'sun',
  avoidWind: false,
  preferParks: true,
  extraMinutes: 10,
  byWeather: false,
};
const DEFAULTS = {
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
  byWeather: true,
};
const HOT = {
  status: 'available',
  answers: { sunShade: 'shade', avoidWind: true },
  message:
    'Hace calor (sensación de 31 °C) y sopla cierzo: he marcado «Sombra» y «Evitar el viento».',
};

describe('useRoutePreferences (PBI-18)', () => {
  beforeEach(() => {
    getRoutePreferences.mockReset().mockResolvedValue(SAVED);
    getWeatherSuggestion.mockReset().mockResolvedValue(HOT);
    saveRoutePreferences.mockReset().mockImplementation(async (preferences) => preferences);
  });

  it('starts with the defaults and then uses the preferences of the account', async () => {
    const { result } = renderHook(() => useRoutePreferences());

    expect(result.current).toMatchObject({ preferences: DEFAULTS, isLoading: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toEqual(SAVED);
    expect(getWeatherSuggestion).not.toHaveBeenCalled();
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

    const chosen = { ...DEFAULTS, sunShade: 'shade', byWeather: false };
    expect(result.current.preferences).toEqual(chosen);
    expect(saveRoutePreferences).toHaveBeenCalledWith(chosen, expect.anything());
    expect(getWeatherSuggestion).not.toHaveBeenCalled();
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
    getWeatherSuggestion.mockRejectedValue(new Error('offline'));
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
      await result.current.replace({ ...DEFAULTS, byWeather: true });
    });

    // The assistant's answers are the user's: «Según el tiempo de hoy» goes off.
    const replaced = { ...DEFAULTS, byWeather: false };
    expect(result.current.preferences).toEqual(replaced);
    expect(saveRoutePreferences).toHaveBeenCalledWith(replaced, expect.anything());

    saveRoutePreferences.mockRejectedValue(new Error('No se han podido guardar tus preferencias.'));
    await act(async () => {
      await expect(result.current.replace(SAVED)).rejects.toThrow('No se han podido guardar');
    });
  });
});

describe('useRoutePreferences: «Según el tiempo de hoy» (PBI-21)', () => {
  beforeEach(() => {
    getRoutePreferences.mockReset().mockResolvedValue({ ...SAVED, byWeather: true });
    getWeatherSuggestion.mockReset().mockResolvedValue(HOT);
    saveRoutePreferences.mockReset().mockImplementation(async (preferences) => preferences);
  });

  it('when it is on, marks what the weather chooses, keeps parks and minutes, and saves it', async () => {
    const { result } = renderHook(() => useRoutePreferences());

    await waitFor(() => expect(result.current.weather.status).toBe('available'));
    const marked = { ...SAVED, sunShade: 'shade', avoidWind: true, byWeather: true };
    expect(result.current.preferences).toEqual(marked);
    expect(result.current.byWeather).toBe(true);
    expect(result.current.weather.message).toBe(HOT.message);
    expect(saveRoutePreferences).toHaveBeenLastCalledWith(marked, expect.anything());
  });

  it('is on for a new user: the defaults ask the weather', async () => {
    getRoutePreferences.mockResolvedValue(DEFAULTS);
    const { result } = renderHook(() => useRoutePreferences());

    await waitFor(() => expect(result.current.weather.status).toBe('available'));
    expect(result.current.preferences).toMatchObject({ sunShade: 'shade', avoidWind: true });
  });

  it('without weather says so and changes nothing', async () => {
    getWeatherSuggestion.mockResolvedValue({
      status: 'unavailable',
      answers: null,
      message:
        'No se ha podido consultar el tiempo actual: tus preferencias se quedan como estaban.',
    });
    const { result } = renderHook(() => useRoutePreferences());

    await waitFor(() => expect(result.current.weather.status).toBe('unavailable'));
    expect(result.current.preferences).toEqual({ ...SAVED, byWeather: true });
    expect(saveRoutePreferences).not.toHaveBeenCalled();
  });

  it('when the request fails says so and changes nothing', async () => {
    getWeatherSuggestion.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRoutePreferences());

    await waitFor(() => expect(result.current.weather.status).toBe('error'));
    expect(result.current.weather.message).toMatch(/tus preferencias se quedan como estaban/);
    expect(result.current.preferences).toEqual({ ...SAVED, byWeather: true });
  });

  it('choosing shade, sun or the wind by hand turns it off; parks and minutes do not', async () => {
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.weather.status).toBe('available'));

    act(() => {
      result.current.change({ preferParks: false, extraMinutes: 2 });
    });
    expect(result.current.byWeather).toBe(true);

    act(() => {
      result.current.change({ sunShade: 'sun' });
    });
    expect(result.current.byWeather).toBe(false);
    expect(result.current.weather.status).toBe('idle');
    expect(saveRoutePreferences).toHaveBeenLastCalledWith(
      expect.objectContaining({ sunShade: 'sun', byWeather: false }),
      expect.anything()
    );
  });

  it('a late answer of the weather is ignored once it is off', async () => {
    let resolveWeather;
    getWeatherSuggestion.mockReturnValue(
      new Promise((resolve) => {
        resolveWeather = resolve;
      })
    );
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.weather.status).toBe('loading'));

    act(() => {
      result.current.toggleWeather();
    });
    await act(async () => resolveWeather(HOT));

    expect(result.current.preferences).toEqual({ ...SAVED, byWeather: false });
  });

  it('can be turned off and on again: on asks the weather again', async () => {
    const { result } = renderHook(() => useRoutePreferences());
    await waitFor(() => expect(result.current.weather.status).toBe('available'));

    act(() => {
      result.current.toggleWeather();
    });
    expect(result.current.byWeather).toBe(false);
    // The answers it marked stay, now as the user's.
    expect(result.current.preferences.sunShade).toBe('shade');

    act(() => {
      result.current.toggleWeather();
    });
    expect(result.current.byWeather).toBe(true);
    await waitFor(() => expect(result.current.weather.status).toBe('available'));
    expect(getWeatherSuggestion).toHaveBeenCalledTimes(2);
  });
});
