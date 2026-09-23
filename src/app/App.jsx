import { AppShell } from '../components/layout/AppShell.jsx';
import { ComfortSummary } from '../features/comfort-summary/ComfortSummary.jsx';
import { MapView } from '../features/map/MapView.jsx';
import { RouteComparisonPanel } from '../features/route-comparison/RouteComparisonPanel.jsx';
import { RouteSearchPanel } from '../features/route-search/RouteSearchPanel.jsx';
import { useDeviceLocation } from '../features/route-search/useDeviceLocation.js';
import { useRoutePoints } from '../features/route-search/useRoutePoints.js';

export function App() {
  const routePoints = useRoutePoints();
  const geolocation = useDeviceLocation({
    onLocated: (pointType, point) => routePoints.setPoint(pointType, point)
  });

  return (
    <AppShell
      map={
        <MapView
          activePoint={routePoints.activePoint}
          destination={routePoints.destination}
          focusPoint={routePoints.lastSelectedPoint}
          onSelectPoint={routePoints.selectPoint}
          origin={routePoints.origin}
        />
      }
      sidebar={
        <>
          <RouteSearchPanel
            activePoint={routePoints.activePoint}
            destination={routePoints.destination}
            geolocation={geolocation.geolocation}
            onClearGeolocationMessage={geolocation.clearGeolocationMessage}
            onClearPoint={routePoints.clearPoint}
            onRequestCurrentLocation={geolocation.requestCurrentLocation}
            onResetPoints={routePoints.resetPoints}
            onSetActivePoint={routePoints.setActivePoint}
            origin={routePoints.origin}
          />
          <RouteComparisonPanel />
          <ComfortSummary />
        </>
      }
    />
  );
}
