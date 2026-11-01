import { useEffect, useRef, useState } from 'react';

import { reversePlace } from '../../services/api/geocodingApi.js';
import { isInsideZaragoza, OUTSIDE_ZARAGOZA_MESSAGE } from '../map/zaragozaArea.js';

export function formatPointLabel(point) {
  if (!point) return 'Sin seleccionar';
  return point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function useRoutePoints() {
  const [state, setState] = useState({
    origin: null,
    destination: null,
    originInput: '',
    destinationInput: '',
    activePoint: 'origin',
    lastSelectedPoint: null,
    pointError: '',
  });
  const nameRequest = useRef({});

  useEffect(
    () => () => Object.values(nameRequest.current).forEach((controller) => controller.abort()),
    []
  );

  // The point works with its coordinates right away; its name replaces them when it arrives. If it
  // never does, the coordinates stay: the name must not block choosing the point.
  async function nameMapPoint(pointType, point) {
    nameRequest.current[pointType]?.abort();
    const controller = new AbortController();
    nameRequest.current[pointType] = controller;
    try {
      const { place } = await reversePlace(point, { signal: controller.signal });
      if (!place?.label) return;
      const named = { ...point, label: place.label };
      setState((current) =>
        // Ignored if the user has already changed this point.
        current[pointType] === point
          ? {
              ...current,
              [pointType]: named,
              [`${pointType}Input`]: place.label,
              lastSelectedPoint:
                current.lastSelectedPoint === point ? named : current.lastSelectedPoint,
            }
          : current
      );
    } catch {
      // Keeps the coordinates.
    }
  }

  function setPoint(pointType, point) {
    if (!isInsideZaragoza(point)) {
      setState((current) => ({ ...current, pointError: OUTSIDE_ZARAGOZA_MESSAGE }));
      return;
    }
    setState((current) => ({
      ...current,
      pointError: '',
      [pointType]: point,
      [`${pointType}Input`]: formatPointLabel(point),
      lastSelectedPoint: point,
      activePoint: 'destination',
    }));
  }
  function selectPoint(point) {
    const pointType = state.activePoint;
    setPoint(pointType, point);
    if (isInsideZaragoza(point)) nameMapPoint(pointType, point);
  }
  function editPoint(pointType, value) {
    setState((current) => ({
      ...current,
      pointError: '',
      [pointType]: null,
      [`${pointType}Input`]: value,
      activePoint: pointType,
      lastSelectedPoint:
        current.lastSelectedPoint === current[pointType] ? null : current.lastSelectedPoint,
    }));
  }
  function resetPoints() {
    setState({
      origin: null,
      destination: null,
      originInput: '',
      destinationInput: '',
      activePoint: 'origin',
      lastSelectedPoint: null,
      pointError: '',
    });
  }
  return {
    ...state,
    setPoint,
    editPoint,
    resetPoints,
    selectPoint,
    clearPoint: (pointType) => editPoint(pointType, ''),
    setActivePoint: (activePoint) => setState((current) => ({ ...current, activePoint })),
  };
}
