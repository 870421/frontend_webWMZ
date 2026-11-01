import { useEffect, useRef, useState } from 'react';

import {
  createDevicePoint,
  getGeolocationErrorMessage,
} from '../route-search/useDeviceLocation.js';
import { isInsideZaragoza } from '../map/zaragozaArea.js';
import { getNavigationProgress } from './navigation.js';

const GEOLOCATION_PERMISSION_DENIED = 1;
const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 };

function getStartProblem() {
  if (window.isSecureContext === false) {
    return 'Iniciar la ruta requiere HTTPS o localhost para acceder a la ubicación.';
  }
  if (!navigator.geolocation) return 'Tu navegador no permite acceder a la ubicación.';
  return null;
}

// Best effort: where it is not available, the screen simply turns off as usual.
function useScreenAwake(isActive) {
  useEffect(() => {
    if (!isActive || !navigator.wakeLock) return undefined;
    let lock = null;
    let released = false;
    const acquire = async () => {
      try {
        const newLock = await navigator.wakeLock.request('screen');
        if (released) newLock.release();
        else lock = newLock;
      } catch {
        // The browser refused it, for example with low battery.
      }
    };
    // The browser releases the lock when the page is hidden.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lock?.release();
    };
  }, [isActive]);
}

// Far from the route the map keeps showing it, and outside Zaragoza the map cannot go there at all.
function canFollowPosition(position, progress) {
  if (!position || !isInsideZaragoza(position)) return false;
  return !(progress.isOffRoute && !progress.hasStarted);
}

/**
 * Follows the device position along a route. Navigation only lasts while that route is the current
 * one: choosing or clearing a route ends it.
 */
export function useRouteNavigation(route) {
  const [session, setSession] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const alongRef = useRef(0);
  const activeRoute = session?.route === route ? route : null;

  useScreenAwake(Boolean(activeRoute));

  useEffect(() => {
    if (!activeRoute) return undefined;
    alongRef.current = 0;
    const { geolocation } = navigator;
    const watchId = geolocation.watchPosition(
      (rawPosition) => {
        const position = createDevicePoint(rawPosition);
        if (!position) return;
        const progress = getNavigationProgress(activeRoute, position, alongRef.current);
        alongRef.current = progress.alongM;
        setSession((current) =>
          current?.route === activeRoute
            ? { ...current, position, progress, signalLost: false }
            : current
        );
      },
      (error) => {
        if (error?.code === GEOLOCATION_PERMISSION_DENIED) {
          setSession(null);
          setErrorMessage(getGeolocationErrorMessage(error));
          return;
        }
        // Temporary: inside a building or under a bridge. The watch goes on.
        setSession((current) =>
          current?.route === activeRoute ? { ...current, signalLost: true } : current
        );
      },
      WATCH_OPTIONS
    );
    return () => geolocation.clearWatch(watchId);
  }, [activeRoute]);

  function start() {
    const problem = getStartProblem();
    setErrorMessage(problem ?? '');
    if (!problem) {
      setSession({ route, position: null, progress: null, signalLost: false, isFollowing: true });
    }
  }

  const canFollow = activeRoute ? canFollowPosition(session.position, session.progress) : false;

  return {
    isActive: Boolean(activeRoute),
    followsPosition: canFollow && session.isFollowing,
    canRecenter: canFollow && !session.isFollowing,
    pauseFollowing: () => setSession((current) => current && { ...current, isFollowing: false }),
    resumeFollowing: () => setSession((current) => current && { ...current, isFollowing: true }),
    position: activeRoute ? session.position : null,
    progress: activeRoute ? session.progress : null,
    signalLost: activeRoute ? session.signalLost : false,
    errorMessage,
    start,
    stop: () => setSession(null),
  };
}
