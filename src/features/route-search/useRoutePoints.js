import { useState } from 'react';

const INITIAL_ACTIVE_POINT = 'origin';

function formatCoordinate(value) {
  return value.toFixed(5);
}

export function formatPointLabel(point) {
  if (!point) {
    return 'Not selected';
  }

  if (point.label) {
    return point.label;
  }

  return `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`;
}

export function useRoutePoints() {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [activePoint, setActivePoint] = useState(INITIAL_ACTIVE_POINT);
  const [lastSelectedPoint, setLastSelectedPoint] = useState(null);

  function selectPoint(point) {
    setLastSelectedPoint(point);

    if (activePoint === 'origin') {
      setOrigin(point);
      setActivePoint('destination');
      return;
    }

    setDestination(point);
  }

  function setPoint(pointType, point) {
    setLastSelectedPoint(point);

    if (pointType === 'origin') {
      setOrigin(point);
      setActivePoint('destination');
      return;
    }

    setDestination(point);
    setActivePoint('destination');
  }

  function clearPoint(pointType) {
    if (pointType === 'origin') {
      setOrigin(null);
      setActivePoint('origin');
      return;
    }

    setDestination(null);
    setActivePoint('destination');
  }

  function resetPoints() {
    setOrigin(null);
    setDestination(null);
    setLastSelectedPoint(null);
    setActivePoint(INITIAL_ACTIVE_POINT);
  }

  return {
    activePoint,
    clearPoint,
    destination,
    lastSelectedPoint,
    origin,
    resetPoints,
    selectPoint,
    setActivePoint,
    setPoint
  };
}
