import { useEffect, useMemo } from 'react';
import { Polyline, useMap } from 'react-leaflet';

const ROUTE_STYLE = {
  color: '#2faa73',
  lineCap: 'round',
  lineJoin: 'round',
  opacity: 0.95,
  weight: 4,
};

export function geometryToPositions(geometry) {
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  return geometry.coordinates.reduce((positions, coordinate) => {
    if (
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1])
    ) {
      positions.push([coordinate[1], coordinate[0]]);
    }

    return positions;
  }, []);
}

function RouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) {
      return;
    }

    map.fitBounds(positions, {
      animate: true,
      maxZoom: 17,
      padding: [48, 48],
    });
  }, [map, positions]);

  return null;
}

export function RouteLayer({ geometry }) {
  const positions = useMemo(() => geometryToPositions(geometry), [geometry]);

  if (positions.length < 2) {
    return null;
  }

  return (
    <>
      <Polyline interactive={false} pathOptions={ROUTE_STYLE} positions={positions} />
      <RouteBounds positions={positions} />
    </>
  );
}
