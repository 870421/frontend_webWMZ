import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_PREFERENCES,
  getRoutePreferences,
  saveRoutePreferences,
} from '../../services/api/routePreferencesApi.js';

/**
 * The simple route preferences of the account (PBI-18, ADR-036). They are loaded when the app opens,
 * so they come back on any device, and every change is saved at once (a newer change cancels the
 * save of an older one). Without the backend the defaults are used and nothing is saved, so that
 * the defaults never overwrite what the account has.
 */
export function useRoutePreferences() {
  const [state, setState] = useState({
    status: 'loading',
    preferences: DEFAULT_PREFERENCES,
    saveError: '',
  });
  const saveRef = useRef(null);
  // An answer chosen while the preferences were loading wins over what arrives.
  const changedWhileLoadingRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    getRoutePreferences({ signal: controller.signal })
      .then((preferences) => {
        const changed = changedWhileLoadingRef.current;
        setState({ status: 'ready', preferences: changed ?? preferences, saveError: '' });
        // eslint-disable-next-line no-use-before-define
        if (changed) save(changed).catch(() => {});
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'offline', preferences: DEFAULT_PREFERENCES, saveError: '' });
        }
      });
    return () => {
      controller.abort();
      saveRef.current?.abort();
    };
  }, []);

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

  /** Changes some answers. The new preferences are used at once; saving them is in the background. */
  function change(changes) {
    const preferences = { ...state.preferences, ...changes };
    setState((current) => ({ ...current, preferences }));
    if (state.status === 'ready') save(preferences).catch(() => {});
    if (state.status === 'loading') changedWhileLoadingRef.current = preferences;
    return preferences;
  }

  /** Replaces every answer (the assistant's "Usar como mis preferencias") and waits for the save. */
  async function replace(preferences) {
    if (state.status !== 'ready') {
      throw new Error('No se han podido cargar tus preferencias: no se pueden guardar ahora.');
    }
    setState((current) => ({ ...current, preferences }));
    await save(preferences);
  }

  return {
    preferences: state.preferences,
    isLoading: state.status === 'loading',
    loadFailed: state.status === 'offline',
    saveError: state.saveError,
    change,
    replace,
  };
}
