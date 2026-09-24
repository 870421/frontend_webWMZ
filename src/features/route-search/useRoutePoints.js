import { useState } from 'react';

export function formatPointLabel(point) {
  if (!point) return 'Not selected';
  return point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function useRoutePoints() {
  const [state, setState] = useState({
    origin: null, destination: null, originInput: '', destinationInput: '',
    activePoint: 'origin', lastSelectedPoint: null
  });

  function setPoint(pointType, point) {
    setState((current) => ({
      ...current, [pointType]: point, [`${pointType}Input`]: formatPointLabel(point),
      lastSelectedPoint: point, activePoint: 'destination'
    }));
  }
  function editPoint(pointType, value) {
    setState((current) => ({
      ...current, [pointType]: null, [`${pointType}Input`]: value, activePoint: pointType,
      lastSelectedPoint: current.lastSelectedPoint === current[pointType] ? null : current.lastSelectedPoint
    }));
  }
  function resetPoints() {
    setState({
      origin: null, destination: null, originInput: '', destinationInput: '',
      activePoint: 'origin', lastSelectedPoint: null
    });
  }
  return {
    ...state, setPoint, editPoint, resetPoints,
    selectPoint: (point) => setPoint(state.activePoint, point),
    clearPoint: (pointType) => editPoint(pointType, ''),
    setActivePoint: (activePoint) => setState((current) => ({ ...current, activePoint }))
  };
}
