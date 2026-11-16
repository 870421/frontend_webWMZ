import { useEffect, useRef, useState } from 'react';

import { askRouteAssistant } from '../../services/api/routeAssistantApi.js';

const IDLE = { status: 'idle', route: null, result: null, errorMessage: '', applied: null };

/**
 * The requests to the route assistant (PBI-9.2).
 * - `route`, `status`, `result` and `errorMessage` are the last request: the route it was asked
 *   for and its answer (or error). The caller shows them only while that route is on screen.
 * - `applied` is the last answer that changed the weights, with the comparison it brought. A later
 *   notice or error does not remove it: the route on screen is still that one.
 */
export function useRouteAssistant() {
  const [state, setState] = useState(IDLE);
  const controllerRef = useRef(null);

  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE);
  }

  async function ask(route, request) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({
      ...current,
      status: 'loading',
      route,
      result: null,
      errorMessage: '',
    }));
    try {
      const result = await askRouteAssistant(request, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      setState((current) => ({
        status: 'done',
        // An applied answer brings its own route: from now on the answer belongs to it.
        route: result.comparison ?? route,
        result,
        errorMessage: '',
        applied: result.comparison ? result : current.applied,
      }));
      return result;
    } catch (error) {
      if (controller.signal.aborted) return null;
      setState((current) => ({
        ...current,
        status: 'error',
        route,
        result: null,
        errorMessage: error.message || 'El asistente no está disponible ahora mismo.',
      }));
      return null;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...state, ask, reset };
}
