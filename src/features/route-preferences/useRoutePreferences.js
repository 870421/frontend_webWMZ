import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_PREFERENCES,
  getRoutePreferences,
  getWeatherSuggestion,
  saveRoutePreferences,
} from '../../services/api/routePreferencesApi.js';

// The answers «Según el tiempo de hoy» chooses: choosing one of them by hand turns it off.
const WEATHER_ANSWERS = ['sunShade', 'avoidWind'];
const WEATHER_ERROR_MESSAGE =
  'No se ha podido consultar el tiempo de hoy: tus preferencias se quedan como estaban.';
const IDLE_WEATHER = { status: 'idle', message: '' };

/**
 * The simple route preferences of the account (PBI-18, ADR-036). They are loaded when the app opens,
 * so they come back on any device, and every change is saved at once (a newer change cancels the
 * save of an older one). Without the backend the defaults are used and nothing is saved, so that
 * the defaults never overwrite what the account has.
 *
 * «Según el tiempo de hoy» (PBI-21, ADR-037) is saved with them: on for a new user. While it is on,
 * the current weather marks shade or sun and the wind (never parks) and `weather.message` says why;
 * without weather nothing changes and the message says so. Choosing shade, sun or the wind by hand
 * turns it off; parks and the minutes are the user's in any case.
 */
export function useRoutePreferences() {
  const [state, setState] = useState({
    status: 'loading',
    preferences: DEFAULT_PREFERENCES,
    saveError: '',
  });
  const [weather, setWeather] = useState(IDLE_WEATHER);
  const saveRef = useRef(null);
  const weatherRef = useRef(null);
  // The latest preferences and status, for the answers that arrive later.
  const latestRef = useRef(state);
  latestRef.current = state;
  // An answer chosen while the preferences were loading wins over what arrives.
  const changedWhileLoadingRef = useRef(null);

  async function save(preferences) {
    saveRef.current?.abort();
    const controller = new AbortController();
    saveRef.current = controller;
    try {
      await saveRoutePreferences(preferences, { signal: controller.signal });
      if (!controller.signal.aborted) setState((current) => ({ ...current, saveError: '' }));
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      setState((current) => ({ ...current, saveError: error.message }));
      throw error;
    } finally {
      if (saveRef.current === controller) saveRef.current = null;
    }
  }

  function apply(preferences, status = latestRef.current.status) {
    latestRef.current = { ...latestRef.current, preferences };
    setState((current) => ({ ...current, preferences }));
    if (status === 'ready') save(preferences).catch(() => {});
    if (status === 'loading') changedWhileLoadingRef.current = preferences;
  }

  // Asks what the weather marks now; the answer only counts if «Según el tiempo de hoy» is still on.
  async function askWeather() {
    weatherRef.current?.abort();
    const controller = new AbortController();
    weatherRef.current = controller;
    setWeather({ status: 'loading', message: 'Consultando el tiempo de hoy…' });
    try {
      const suggestion = await getWeatherSuggestion({ signal: controller.signal });
      const { preferences, status } = latestRef.current;
      if (controller.signal.aborted || !preferences.byWeather) return;
      setWeather({ status: suggestion.status, message: suggestion.message });
      if (suggestion.answers) apply({ ...preferences, ...suggestion.answers }, status);
    } catch {
      if (!controller.signal.aborted)
        setWeather({ status: 'error', message: WEATHER_ERROR_MESSAGE });
    } finally {
      if (weatherRef.current === controller) weatherRef.current = null;
    }
  }

  function stopWeather() {
    weatherRef.current?.abort();
    setWeather(IDLE_WEATHER);
  }

  useEffect(() => {
    const controller = new AbortController();
    getRoutePreferences({ signal: controller.signal })
      .then((loaded) => {
        const changed = changedWhileLoadingRef.current;
        const preferences = changed ?? loaded;
        latestRef.current = { status: 'ready', preferences, saveError: '' };
        setState(latestRef.current);
        if (changed) save(changed).catch(() => {});
        if (preferences.byWeather) askWeather();
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const preferences = changedWhileLoadingRef.current ?? DEFAULT_PREFERENCES;
        latestRef.current = { status: 'offline', preferences, saveError: '' };
        setState(latestRef.current);
        if (preferences.byWeather) askWeather();
      });
    return () => {
      controller.abort();
      saveRef.current?.abort();
      weatherRef.current?.abort();
    };
    // Only once, when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Changes some answers. Shade, sun or the wind chosen by hand turn «Según el tiempo de hoy» off. */
  function change(changes) {
    const current = latestRef.current.preferences;
    const leavesWeather = WEATHER_ANSWERS.some((field) => field in changes);
    const preferences = { ...current, ...changes, ...(leavesWeather && { byWeather: false }) };
    if (leavesWeather && current.byWeather) stopWeather();
    apply(preferences);
    return preferences;
  }

  /** Turns «Según el tiempo de hoy» on (and asks the weather) or off (the answers stay). */
  function toggleWeather() {
    const current = latestRef.current.preferences;
    if (current.byWeather) {
      stopWeather();
      apply({ ...current, byWeather: false });
    } else {
      apply({ ...current, byWeather: true });
      askWeather();
    }
  }

  /** Replaces every answer (the assistant's "Usar como mis preferencias") and waits for the save. */
  async function replace(answers) {
    if (state.status !== 'ready') {
      throw new Error('No se han podido cargar tus preferencias: no se pueden guardar ahora.');
    }
    const preferences = { ...answers, byWeather: false };
    stopWeather();
    latestRef.current = { ...latestRef.current, preferences };
    setState((current) => ({ ...current, preferences }));
    await save(preferences);
  }

  return {
    preferences: state.preferences,
    byWeather: state.preferences.byWeather,
    weather,
    isLoading: state.status === 'loading',
    loadFailed: state.status === 'offline',
    saveError: state.saveError,
    change,
    toggleWeather,
    replace,
  };
}
