import { useCallback, useEffect, useState } from 'react';

import {
  addRouteFavorite,
  clearRouteHistory,
  listRouteFavorites,
  listRouteHistory,
  recordRouteSearch,
  removeRouteFavorite,
} from '../../services/api/routeHistoryApi.js';

// The backend keeps the last 10 searches (PBI-12); the list is cut the same way meanwhile.
const MAX_SEARCHES = 10;

// The backend rounds the points to 5 decimals (about a metre): the same trip compares equal here.
const pointKey = ({ lat, lng }) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
export const tripKey = ({ origin, destination }) => `${pointKey(origin)}>${pointKey(destination)}`;

export function useRouteHistory() {
  const [searches, setSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listRouteHistory({ signal: controller.signal }),
      listRouteFavorites({ signal: controller.signal }),
    ])
      .then(([loadedSearches, loadedFavorites]) => {
        setSearches(loadedSearches);
        setFavorites(loadedFavorites);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, []);

  // A failed record is not shown: the history must never get in the way of the route.
  const recordSearch = useCallback(async (trip) => {
    try {
      const search = await recordRouteSearch(trip);
      setSearches((current) =>
        [search, ...current.filter((item) => item.id !== search.id)].slice(0, MAX_SEARCHES)
      );
    } catch {
      // Keeps the list as it was.
    }
  }, []);

  async function clearHistory() {
    await clearRouteHistory();
    setSearches([]);
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
    searches,
    favorites,
    status,
    recordSearch,
    clearHistory,
    addFavorite,
    removeFavorite,
    isFavorite: (trip) => favoriteKeys.has(tripKey(trip)),
  };
}
