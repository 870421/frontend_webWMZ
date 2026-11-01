import { useState } from 'react';

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
    selectPoint: (point) => setPoint(state.activePoint, point),
    clearPoint: (pointType) => editPoint(pointType, ''),
    setActivePoint: (activePoint) => setState((current) => ({ ...current, activePoint })),
  };
}
