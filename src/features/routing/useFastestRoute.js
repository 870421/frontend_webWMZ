import { useEffect, useRef, useState } from 'react';

import { getFastestRoute } from '../../services/api/routesApi.js';

const EMPTY_STATE = { status: 'idle', route: null, errorMessage: '' };

export function useFastestRoute() {
  const [state, setState] = useState(EMPTY_STATE);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  function clearRoute() {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(EMPTY_STATE);
  }

  async function calculateRoute(origin, destination) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current = controller;
    setState({ status: 'loading', route: null, errorMessage: '' });

    try {
      const route = await getFastestRoute({ origin, destination }, { signal: controller.signal });
      if (requestId !== requestIdRef.current || controller.signal.aborted) return null;
      setState({ status: 'success', route, errorMessage: '' });
      return route;
    } catch (error) {
      if (requestId !== requestIdRef.current || controller.signal.aborted) return null;
      setState({
        status: 'error',
        route: null,
        errorMessage: error.message || 'No se ha podido calcular la ruta. Inténtalo de nuevo.'
      });
      return null;
    } finally {
      if (requestId === requestIdRef.current) controllerRef.current = null;
    }
  }

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...state, calculateRoute, clearRoute };
}
