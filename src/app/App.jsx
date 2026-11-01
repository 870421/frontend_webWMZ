import { useState } from 'react';

import { AppShell } from '../components/layout/AppShell.jsx';
import { ComfortSummary } from '../features/comfort-summary/ComfortSummary.jsx';
import { MapView } from '../features/map/MapView.jsx';
import { isInsideZaragoza, OUTSIDE_ZARAGOZA_MESSAGE } from '../features/map/zaragozaArea.js';
import { RouteComparisonPanel } from '../features/route-comparison/RouteComparisonPanel.jsx';
import { getZaragozaDateTime } from '../features/routing/zaragozaDateTime.js';
import { useRoutePlanner } from '../features/routing/useRoutePlanner.js';
import { RouteSearchPanel } from '../features/route-search/RouteSearchPanel.jsx';
import { useDeviceLocation } from '../features/route-search/useDeviceLocation.js';
import { useRoutePoints } from '../features/route-search/useRoutePoints.js';

export function App({ userMenu = null }) {
  const routePoints = useRoutePoints();
  const routePlanner = useRoutePlanner();
  const [routeType, setRouteType] = useState('fastest');
  const [solarDateTime, setSolarDateTime] = useState(getZaragozaDateTime);
  const geolocation = useDeviceLocation({
    onLocated: (pointType, point) => {
      routePlanner.clearRoutes();
      routePoints.setPoint(pointType, point);
    },
    validatePoint: (point) => (isInsideZaragoza(point) ? null : OUTSIDE_ZARAGOZA_MESSAGE),
  });
  function withSelectionUpdated(action) {
    return (...args) => {
      geolocation.clearGeolocationMessage();
      routePlanner.clearRoutes();
      action(...args);
    };
  }

  const selectedRouteType = routeType === 'shaded' && routePlanner.shaded ? 'shaded' : 'fastest';
  const activeRoute = selectedRouteType === 'shaded' ? routePlanner.shaded : routePlanner.fastest;

  function updateSolarDateTime(field, value) {
    routePlanner.clearRoutes();
    setSolarDateTime((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      userMenu={userMenu}
      map={
        <MapView
          activePoint={routePoints.activePoint}
          destination={routePoints.destination}
          focusPoint={routePoints.lastSelectedPoint}
          onSelectPoint={withSelectionUpdated(routePoints.selectPoint)}
          origin={routePoints.origin}
          fastestRoute={routePlanner.fastest}
          shadedRoute={routePlanner.shaded}
          selectedRouteType={selectedRouteType}
        />
      }
      sidebar={
        <>
          <RouteSearchPanel
            activePoint={routePoints.activePoint}
            destination={routePoints.destination}
            geolocation={geolocation.geolocation}
            onClearGeolocationMessage={geolocation.clearGeolocationMessage}
            onCalculateRoute={() =>
              routePlanner.calculateRoute(routePoints.origin, routePoints.destination, {
                routeType,
                ...solarDateTime,
              })
            }
            originInput={routePoints.originInput}
            destinationInput={routePoints.destinationInput}
            onEditPoint={withSelectionUpdated(routePoints.editPoint)}
            onClearPoint={withSelectionUpdated(routePoints.clearPoint)}
            onRequestCurrentLocation={geolocation.requestCurrentLocation}
            onResetPoints={withSelectionUpdated(routePoints.resetPoints)}
            onSetActivePoint={routePoints.setActivePoint}
            onSetPoint={withSelectionUpdated(routePoints.setPoint)}
            origin={routePoints.origin}
            pointErrorMessage={routePoints.pointError}
            routeCalculation={{ ...routePlanner, activeRoute }}
            routeType={routeType}
            onRouteTypeChange={setRouteType}
            solarDate={solarDateTime.date}
            solarTime={solarDateTime.time}
            onSolarDateChange={(value) => updateSolarDateTime('date', value)}
            onSolarTimeChange={(value) => updateSolarDateTime('time', value)}
            renderComparison={(collapse) =>
              routePlanner.comparison ? (
                <RouteComparisonPanel
                  comparison={routePlanner.comparison}
                  selectedRouteType={selectedRouteType}
                  onSelectRoute={setRouteType}
                  {...collapse}
                />
              ) : null
            }
          />
          <div className="future-panels">
            <ComfortSummary />
          </div>
        </>
      }
    />
  );
}
