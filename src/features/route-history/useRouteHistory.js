import { useCallback, useEffect, useState } from 'react';

import {
  addRouteFavorite,
  clearRecentPlaces,
  listRecentPlaces,
  listRouteFavorites,
  recordRecentPlaces,
  removeRouteFavorite,
} from '../../services/api/routeHistoryApi.js';
import { DEVICE_SOURCE } from '../route-search/useDeviceLocation.js';

// The backend rounds the points to 5 decimals (about a metre): the same place compares equal here.
export const placeKey = ({ lat, lng }) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
export const tripKey = ({ origin, destination }) => `${placeKey(origin)}>${placeKey(destination)}`;

/**
 * The favourite trips (PBI-12) and the places used recently as origin or destination (#180, they
 * replace the history of trips) of the user. The device location is never a recent place: its
 * coordinates are only valid at that moment.
 */
export function useRouteHistory() {
  const [places, setPlaces] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listRecentPlaces({ signal: controller.signal }),
      listRouteFavorites({ signal: controller.signal }),
    ])
      .then(([loadedPlaces, loadedFavorites]) => {
        setPlaces(loadedPlaces);
        setFavorites(loadedFavorites);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, []);

  // The points of a calculated route, in the order they were used. A failed record is not shown:
  // the history must never get in the way of the route.
  const recordPlaces = useCallback(async (points) => {
    const used = points.filter((point) => point && point.source !== DEVICE_SOURCE);
    if (!used.length) return;
    try {
      setPlaces(await recordRecentPlaces(used));
    } catch {
      // Keeps the list as it was.
    }
  }, []);

  async function clearPlaces() {
    await clearRecentPlaces();
    setPlaces([]);
  }

  async function addFavorite(trip, name) {
    const favorite = await addRouteFavorite(trip, name);
    setFavorites((current) => [...current, favorite]);
    return favorite;
  }

  async function removeFavorite(id) {
    await removeRouteFavorite(id);
    setFavorites((current) => current.filter((favorite) => favorite.id !== id));
  }

  const favoriteKeys = new Set(favorites.map(tripKey));

  return {
    places,
    favorites,
    status,
    recordPlaces,
    clearPlaces,
    addFavorite,
    removeFavorite,
    isFavorite: (trip) => favoriteKeys.has(tripKey(trip)),
  };
}
