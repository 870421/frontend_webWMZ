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

// Thicker than the routes as well as darker: the difference is not only the colour.
const SELECTED_STEP_STYLE = {
  color: '#0f4c3a',
  lineCap: 'round',
  lineJoin: 'round',
  opacity: 1,
  weight: 9,
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

const ROUTE_MARGIN_PX = 32;
const OVERLAY_SELECTOR = '.control-panel, .route-actions';

// The search panel and the mobile bottom sheet float over the map. Fitting the route with a fixed
// padding hid it under them, so the padding grows on the side each visible overlay covers.
export function overlayPadding(container, overlays) {
  const box = container.getBoundingClientRect();
  let top = 0;
  let bottom = 0;
  let left = 0;

  overlays.forEach((overlay) => {
    const rect = overlay.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= box.top || rect.top >= box.bottom) return;
    if (rect.width > box.width * 0.6) {
      if (rect.top - box.top < box.bottom - rect.bottom) top = Math.max(top, rect.bottom - box.top);
      else bottom = Math.max(bottom, box.bottom - rect.top);
    } else if (rect.left - box.left < box.right - rect.right) {
      left = Math.max(left, rect.right - box.left);
    }
  });

  // Keep at least a quarter of the map for the route, whatever the overlays cover.
  const maxVertical = box.height * 0.75;
  if (top + bottom > maxVertical) {
    const scale = maxVertical / (top + bottom);
    top *= scale;
    bottom *= scale;
  }
  left = Math.min(left, box.width * 0.75);

  return {
    paddingTopLeft: [left + ROUTE_MARGIN_PX, top + ROUTE_MARGIN_PX],
    paddingBottomRight: [ROUTE_MARGIN_PX, bottom + ROUTE_MARGIN_PX],
  };
}

function RouteBounds({ positions, minPositions = 2, maxZoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < minPositions) {
      return;
    }

    const container = map.getContainer?.();
    const padding = container
      ? overlayPadding(container, document.querySelectorAll(OVERLAY_SELECTOR))
      : { padding: [ROUTE_MARGIN_PX, ROUTE_MARGIN_PX] };
    map.fitBounds(positions, {
      animate: true,
      maxZoom,
      ...padding,
    });
  }, [map, positions, minPositions, maxZoom]);

  return null;
}

export function RouteLayer({
  fastestGeometry,
  shadedGeometry,
  selectedRouteType = 'fastest',
  selectedStepGeometry = null,
}) {
  const stepPositions = useMemo(
    () => geometryToPositions(selectedStepGeometry),
    [selectedStepGeometry]
  );
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
          pathOptions={
            // Alone, the fastest route is the route: a solid line, not the dashed "other option".
            shadedPositions.length >= 2
              ? {
                  ...FASTEST_STYLE,
                  opacity: selectedRouteType === 'fastest' ? 0.95 : 0.45,
                  weight: selectedRouteType === 'fastest' ? 5 : 3,
                }
              : { ...SHADED_STYLE, weight: 5 }
          }
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
      {stepPositions.length >= 2 && (
        <Polyline interactive={false} pathOptions={SELECTED_STEP_STYLE} positions={stepPositions} />
      )}
      <RouteBounds positions={allPositions} />
      {/* The final step ("you have arrived") is a single point. */}
      <RouteBounds positions={stepPositions} minPositions={1} maxZoom={18} />
    </>
  );
}
