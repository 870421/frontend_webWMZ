import { useState } from 'react';

import { AppShell } from '../components/layout/AppShell.jsx';
import { ComfortSummary } from '../features/comfort-summary/ComfortSummary.jsx';
import { MapView } from '../features/map/MapView.jsx';
import { isInsideZaragoza, OUTSIDE_ZARAGOZA_MESSAGE } from '../features/map/zaragozaArea.js';
import { AssistantFab } from '../features/route-assistant/AssistantFab.jsx';
import { RouteAssistant } from '../features/route-assistant/RouteAssistant.jsx';
import { useRouteAssistant } from '../features/route-assistant/useRouteAssistant.js';
import { RouteComparisonPanel } from '../features/route-comparison/RouteComparisonPanel.jsx';
import { RoutePreferences } from '../features/route-preferences/RoutePreferences.jsx';
import {
  answersFromWeights,
  hasPreference,
} from '../features/route-preferences/preferenceTexts.js';
import { useRoutePreferences } from '../features/route-preferences/useRoutePreferences.js';
import { RecommendationCard } from '../features/route-recommendation/RecommendationCard.jsx';
import { NavigationPanel } from '../features/routing/NavigationPanel.jsx';
import { useRouteNavigation } from '../features/routing/useRouteNavigation.js';
import { getZaragozaDateTime } from '../features/routing/zaragozaDateTime.js';
import { useRoutePlanner } from '../features/routing/useRoutePlanner.js';
import { RouteSearchPanel } from '../features/route-search/RouteSearchPanel.jsx';
import { useDeviceLocation } from '../features/route-search/useDeviceLocation.js';
import { RouteHistory } from '../features/route-history/RouteHistory.jsx';
import { useRouteHistory } from '../features/route-history/useRouteHistory.js';
import { useRoutePoints } from '../features/route-search/useRoutePoints.js';
import { WeatherPanel } from '../features/weather/WeatherPanel.jsx';

const ignoreMapPoint = () => {};
// The route chosen with the preferences (or the weather) is "Tu ruta", as in the sketches of the
// team (Mejoras_S4); the other one is "La más rápida".
const ALTERNATIVE_LABEL = 'Tu ruta';

function getStepGeometry(route, stepIndex) {
  const [start, end] = route.steps[stepIndex].wayPoints;
  return { type: 'LineString', coordinates: route.geometry.coordinates.slice(start, end + 1) };
}

export function App({ userMenu = null }) {
  const routePoints = useRoutePoints();
  const routePlanner = useRoutePlanner();
  const routePreferences = useRoutePreferences();
  const { preferences } = routePreferences;
  const routeHistory = useRouteHistory();
  const routeAssistant = useRouteAssistant();
  // "Según el tiempo": the recommended route of PBI-9.1 as it was, provisional until PBI-21. It is
  // not saved in the account (ADR-036).
  const [byWeather, setByWeather] = useState(false);
  // Which of the two calculated routes is shown: the fastest one or the one chosen with the weights.
  const [shownRoute, setShownRoute] = useState('shaded');
  const [solarDateTime, setSolarDateTime] = useState(getZaragozaDateTime);
  const [selectedStep, setSelectedStep] = useState(null);
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

  const isRecommended = byWeather;
  // The route on screen. An answer of the route assistant (PBI-9.2) only counts while the route it
  // belongs to is shown: choosing another route, other points or another time leaves it behind.
  const shownComparisonOrRoute = routePlanner.comparison ?? routePlanner.fastest;
  const assistantIsCurrent =
    Boolean(shownComparisonOrRoute) && routeAssistant.route === shownComparisonOrRoute;
  // The last weights the assistant applied, while their route is the one on screen (a later notice
  // or error keeps them).
  const adjustment =
    routePlanner.comparison && routeAssistant.applied?.comparison === routePlanner.comparison
      ? routeAssistant.applied.assistant
      : null;
  // The answers decide how "Calcular ruta" works and whether a date is asked for: with every answer
  // indifferent only the fastest route is calculated (PBI-18). The type on screen follows the
  // assistant's answers when it changed them.
  const chosenRouteType = isRecommended || hasPreference(preferences) ? 'shaded' : 'fastest';
  let routeType = chosenRouteType;
  if (adjustment) routeType = hasPreference(adjustment.after) ? 'shaded' : 'fastest';
  // Only shade and sun depend on the date and time; "Según el tiempo" is always for now.
  const asksSolarDateTime =
    !isRecommended && chosenRouteType === 'shaded' && preferences.sunShade !== 'any';
  const alternativeLabel = ALTERNATIVE_LABEL;
  const selectedRouteType =
    routeType === 'shaded' && shownRoute === 'shaded' && routePlanner.shaded ? 'shaded' : 'fastest';
  const activeRoute = selectedRouteType === 'shaded' ? routePlanner.shaded : routePlanner.fastest;
  // The selected step belongs to one route: with another route (or none) nothing is selected.
  const selectedStepIndex = selectedStep?.route === activeRoute ? selectedStep.index : null;
  const selectedStepGeometry =
    selectedStepIndex === null ? null : getStepGeometry(activeRoute, selectedStepIndex);
  const navigation = useRouteNavigation(activeRoute);
  // The floating button of the assistant (#179): only with a calculated route on screen and not while
  // walking it.
  const showsAssistant =
    Boolean(activeRoute) && routePlanner.status !== 'loading' && !navigation.isActive;

  // A new answer means another route: the calculated ones go away and "Según el tiempo" too.
  function changePreferences(changes) {
    routePlanner.clearRoutes();
    setShownRoute('shaded');
    setByWeather(false);
    routePreferences.change(changes);
  }

  function toggleWeather() {
    routePlanner.clearRoutes();
    setShownRoute('shaded');
    setByWeather((current) => !current);
  }

  // The places of a route that is calculated go to the recent places (#180); a failed one does not.
  async function calculateRoute(origin, destination, dateTime = solarDateTime) {
    setShownRoute('shaded');
    const result = await routePlanner.calculateRoute(origin, destination, {
      routeType: chosenRouteType,
      recommended: isRecommended,
      preferences,
      ...dateTime,
    });
    if (result) routeHistory.recordPlaces([origin, destination]);
  }

  // The answers of the route on screen: the assistant's, those behind the weights the weather chose
  // or the user's.
  function currentPreferences() {
    if (adjustment) return adjustment.after;
    if (!isRecommended) return preferences;
    return {
      ...answersFromWeights(routePlanner.comparison?.recommendation?.weights),
      extraMinutes: preferences.extraMinutes,
    };
  }

  // The assistant recalculates the route of the same points; if it fails, the route stays.
  async function askAssistant(message) {
    const result = await routeAssistant.ask(shownComparisonOrRoute, {
      origin: routePoints.origin,
      destination: routePoints.destination,
      // The date and time chosen by the user, if they chose one; otherwise the backend uses now.
      ...(asksSolarDateTime ? solarDateTime : {}),
      message,
      preferences: currentPreferences(),
    });
    if (result?.comparison) {
      setShownRoute('shaded');
      routePlanner.showComparison(result.comparison);
    }
  }

  // A favourite trip is calculated again for now, with the route type chosen.
  function repeatTrip({ origin, destination }) {
    geolocation.clearGeolocationMessage();
    routePlanner.clearRoutes();
    if (!routePoints.setTrip(origin, destination)) return;
    const now = getZaragozaDateTime();
    setSolarDateTime(now);
    calculateRoute(origin, destination, now);
  }

  function updateSolarDateTime(field, value) {
    routePlanner.clearRoutes();
    setSolarDateTime((current) => ({ ...current, [field]: value }));
  }

  return (
    <AppShell
      userMenu={userMenu}
      weather={<WeatherPanel />}
      map={
        <MapView
          activePoint={routePoints.activePoint}
          destination={routePoints.destination}
          focusPoint={routePoints.lastSelectedPoint}
          // While walking a route, a tap on the map must not change it.
          onSelectPoint={
            navigation.isActive ? ignoreMapPoint : withSelectionUpdated(routePoints.selectPoint)
          }
          origin={routePoints.origin}
          fastestRoute={routePlanner.fastest}
          shadedRoute={routePlanner.shaded}
          alternativeLabel={alternativeLabel}
          selectedRouteType={selectedRouteType}
          selectedStepGeometry={navigation.isActive ? null : selectedStepGeometry}
          navigationPosition={navigation.position}
          followNavigation={navigation.followsPosition}
          onNavigationDrag={navigation.pauseFollowing}
          assistantButton={
            showsAssistant ? (
              <AssistantFab isAdjusted={Boolean(adjustment)}>
                {(draft) => (
                  <RouteAssistant
                    status={assistantIsCurrent ? routeAssistant.status : 'idle'}
                    result={assistantIsCurrent ? routeAssistant.result : null}
                    applied={adjustment}
                    errorMessage={routeAssistant.errorMessage}
                    onAsk={askAssistant}
                    {...draft}
                  />
                )}
              </AssistantFab>
            ) : null
          }
        />
      }
      sidebar={
        navigation.isActive ? (
          <NavigationPanel
            progress={navigation.progress}
            signalLost={navigation.signalLost}
            onStop={navigation.stop}
            onRecenter={navigation.canRecenter ? navigation.resumeFollowing : null}
          />
        ) : (
          <>
            <RouteSearchPanel
              activePoint={routePoints.activePoint}
              destination={routePoints.destination}
              geolocation={geolocation.geolocation}
              onClearGeolocationMessage={geolocation.clearGeolocationMessage}
              onCalculateRoute={() => calculateRoute(routePoints.origin, routePoints.destination)}
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
              selectedStepIndex={selectedStepIndex}
              onSelectStep={(index) => setSelectedStep({ route: activeRoute, index })}
              onStartNavigation={navigation.start}
              navigationError={navigation.errorMessage}
              routeType={routeType}
              asksSolarDateTime={asksSolarDateTime}
              alternativeLabel={alternativeLabel}
              recentPlaces={routeHistory.places}
              routeHistory={
                <RouteHistory
                  history={routeHistory}
                  currentTrip={
                    routePoints.origin && routePoints.destination
                      ? { origin: routePoints.origin, destination: routePoints.destination }
                      : null
                  }
                  onSelectTrip={repeatTrip}
                />
              }
              preferences={
                <RoutePreferences
                  preferences={preferences}
                  byWeather={byWeather}
                  isCompact={Boolean(routePlanner.fastest)}
                  loadFailed={routePreferences.loadFailed}
                  saveError={routePreferences.saveError}
                  onChange={changePreferences}
                  onToggleWeather={toggleWeather}
                />
              }
              solarDate={solarDateTime.date}
              solarTime={solarDateTime.time}
              onSolarDateChange={(value) => updateSolarDateTime('date', value)}
              onSolarTimeChange={(value) => updateSolarDateTime('time', value)}
              renderComparison={(collapse) =>
                routePlanner.comparison ? (
                  <>
                    <RecommendationCard
                      recommendation={routePlanner.comparison.recommendation}
                      isExpanded={collapse.isExpanded}
                    />
                    <RouteComparisonPanel
                      comparison={routePlanner.comparison}
                      selectedRouteType={selectedRouteType}
                      alternativeLabel={alternativeLabel}
                      onSelectRoute={setShownRoute}
                      {...collapse}
                    />
                    <ComfortSummary
                      comparison={routePlanner.comparison}
                      selectedRouteType={selectedRouteType}
                      alternativeLabel={alternativeLabel}
                      weights={
                        routePlanner.comparison.weights ??
                        routePlanner.comparison.recommendation?.weights
                      }
                      isExpanded={collapse.isExpanded}
                    />
                  </>
                ) : null
              }
            />
          </>
        )
      }
    />
  );
}
