import { useEffect, useMemo } from 'react';
import { Polyline, useMap } from 'react-leaflet';

const FASTEST_STYLE = {
  color: '#40566b',
  dashArray: '8 7',
  lineCap: 'round',
  lineJoin: 'round',
  opacity: 0.78,
  weight: 4,
};

const SHADED_STYLE = {
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

export function RouteLayer({ fastestGeometry, shadedGeometry, selectedRouteType = 'fastest' }) {
  const fastestPositions = useMemo(() => geometryToPositions(fastestGeometry), [fastestGeometry]);
  const shadedPositions = useMemo(() => geometryToPositions(shadedGeometry), [shadedGeometry]);
  const allPositions = useMemo(
    () => [...fastestPositions, ...shadedPositions],
    [fastestPositions, shadedPositions]
  );

  if (allPositions.length < 2) {
    return null;
  }

  return (
    <>
      {fastestPositions.length >= 2 && (
        <Polyline
          interactive={false}
          pathOptions={{
            ...FASTEST_STYLE,
            opacity: selectedRouteType === 'fastest' ? 0.95 : 0.45,
            weight: selectedRouteType === 'fastest' ? 5 : 3,
          }}
          positions={fastestPositions}
        />
      )}
      {shadedPositions.length >= 2 && (
        <Polyline
          interactive={false}
          pathOptions={{
            ...SHADED_STYLE,
            opacity: selectedRouteType === 'shaded' ? 0.98 : 0.5,
            weight: selectedRouteType === 'shaded' ? 6 : 4,
          }}
          positions={shadedPositions}
        />
      )}
      <RouteBounds positions={allPositions} />
    </>
  );
}
