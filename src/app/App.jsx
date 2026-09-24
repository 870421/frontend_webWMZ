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
  function withLocationCancelled(action) {
    return (...args) => {
      geolocation.clearGeolocationMessage();
      action(...args);
    };
  }

  return (
    <AppShell
      map={
        <MapView
          activePoint={routePoints.activePoint}
          destination={routePoints.destination}
          focusPoint={routePoints.lastSelectedPoint}
          onSelectPoint={withLocationCancelled(routePoints.selectPoint)}
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
            originInput={routePoints.originInput}
            destinationInput={routePoints.destinationInput}
            onEditPoint={withLocationCancelled(routePoints.editPoint)}
            onClearPoint={withLocationCancelled(routePoints.clearPoint)}
            onRequestCurrentLocation={geolocation.requestCurrentLocation}
            onResetPoints={withLocationCancelled(routePoints.resetPoints)}
            onSetActivePoint={routePoints.setActivePoint}
            onSetPoint={withLocationCancelled(routePoints.setPoint)}
            origin={routePoints.origin}
          />
          <RouteComparisonPanel />
          <ComfortSummary />
        </>
      }
    />
  );
}
