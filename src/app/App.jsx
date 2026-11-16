import { useState } from 'react';

import { AppShell } from '../components/layout/AppShell.jsx';
import { ComfortSummary } from '../features/comfort-summary/ComfortSummary.jsx';
import { MapView } from '../features/map/MapView.jsx';
import { isInsideZaragoza, OUTSIDE_ZARAGOZA_MESSAGE } from '../features/map/zaragozaArea.js';
import { RouteAssistant } from '../features/route-assistant/RouteAssistant.jsx';
import { useRouteAssistant } from '../features/route-assistant/useRouteAssistant.js';
import { RouteComparisonPanel } from '../features/route-comparison/RouteComparisonPanel.jsx';
import { RouteProfilePicker } from '../features/route-profiles/RouteProfilePicker.jsx';
import {
  RECOMMENDED_PROFILE,
  RECOMMENDED_PROFILE_ID,
  hasEnvironmentalWeight,
  hasShadeWeight,
  useRouteProfiles,
} from '../features/route-profiles/useRouteProfiles.js';
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

function getStepGeometry(route, stepIndex) {
  const [start, end] = route.steps[stepIndex].wayPoints;
  return { type: 'LineString', coordinates: route.geometry.coordinates.slice(start, end + 1) };
}

export function App({ userMenu = null }) {
  const routePoints = useRoutePoints();
  const routePlanner = useRoutePlanner();
  const routeProfiles = useRouteProfiles();
  const routeHistory = useRouteHistory();
  const routeAssistant = useRouteAssistant();
  const [profileId, setProfileId] = useState(null);
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

  // The recommended route (PBI-9.1) goes first, but the default is still the first saved route.
  const pickerProfiles = [RECOMMENDED_PROFILE, ...routeProfiles.profiles];
  // While loading, the presets are shown with their presetKey as id: a choice made then is kept
  // once the routes of the user arrive.
  const profile =
    pickerProfiles.find(({ id }) => id === profileId) ??
    routeProfiles.profiles.find(({ presetKey }) => presetKey && presetKey === profileId) ??
    routeProfiles.profiles[0] ??
    null;
  // Internally "shaded" is still the route chosen with the weights: it is shown like the Shaded
  // Route of PBI-5.4, with the name of the profile.
  // The recommended route is compared with the fastest one like any route with weights.
  const isRecommended = profile?.id === RECOMMENDED_PROFILE_ID;
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
  // The type of the chosen route decides how "Calcular ruta" works and whether a date is asked for;
  // the type on screen follows the assistant's weights when it changed them.
  const profileRouteType =
    isRecommended || (profile && hasEnvironmentalWeight(profile.weights)) ? 'shaded' : 'fastest';
  let routeType = profileRouteType;
  if (adjustment)
    routeType = hasEnvironmentalWeight(adjustment.after.weights) ? 'shaded' : 'fastest';
  // The recommended route is always for now, with the current weather.
  const asksSolarDateTime =
    !isRecommended && profileRouteType === 'shaded' && hasShadeWeight(profile.weights);
  const alternativeLabel = adjustment ? 'Ajustada' : (profile?.name ?? 'Con sombra');
  const selectedRouteType =
    routeType === 'shaded' && shownRoute === 'shaded' && routePlanner.shaded ? 'shaded' : 'fastest';
  const activeRoute = selectedRouteType === 'shaded' ? routePlanner.shaded : routePlanner.fastest;
  // The selected step belongs to one route: with another route (or none) nothing is selected.
  const selectedStepIndex = selectedStep?.route === activeRoute ? selectedStep.index : null;
  const selectedStepGeometry =
    selectedStepIndex === null ? null : getStepGeometry(activeRoute, selectedStepIndex);
  const navigation = useRouteNavigation(activeRoute);

  function selectProfile(id) {
    routePlanner.clearRoutes();
    setShownRoute('shaded');
    setProfileId(id);
  }

  async function saveProfile(id, draft) {
    const saved = await routeProfiles.saveProfile(id, draft);
    // The calculated routes were chosen with the old weights.
    if (saved.id === profile?.id) routePlanner.clearRoutes();
    return saved;
  }

  async function deleteProfile(id) {
    await routeProfiles.deleteProfile(id);
    if (id === profile?.id) selectProfile(null);
  }

  // A route that is calculated goes to the history (PBI-12); a failed one does not.
  async function calculateRoute(origin, destination, dateTime = solarDateTime) {
    setShownRoute('shaded');
    const result = await routePlanner.calculateRoute(origin, destination, {
      routeType: profileRouteType,
      recommended: isRecommended,
      weights: profile?.weights,
      maxDetourPercentage: profile?.maxDetourPercentage,
      ...dateTime,
    });
    if (result) routeHistory.recordSearch({ origin, destination });
  }

  // The weights of the route on screen: the assistant's, the recommended ones or the profile's.
  function currentSetting() {
    if (adjustment) return adjustment.after;
    const source = isRecommended ? routePlanner.comparison?.recommendation : profile;
    return {
      weights: { shade: 0, sun: 0, wind: 0, vegetation: 0, ...source?.weights },
      maxDetourPercentage: source?.maxDetourPercentage ?? 25,
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
      ...currentSetting(),
    });
    if (result?.comparison) {
      setShownRoute('shaded');
      routePlanner.showComparison(result.comparison);
    }
  }

  // A recent or favourite trip is calculated again for now, with the route type chosen.
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
              routeHistory={<RouteHistory history={routeHistory} onSelectTrip={repeatTrip} />}
              assistant={
                <RouteAssistant
                  status={assistantIsCurrent ? routeAssistant.status : 'idle'}
                  result={assistantIsCurrent ? routeAssistant.result : null}
                  applied={adjustment}
                  errorMessage={routeAssistant.errorMessage}
                  canSave={routeProfiles.isEditable}
                  profiles={routeProfiles.profiles}
                  onAsk={askAssistant}
                  onSaveProfile={(draft) => routeProfiles.saveProfile(null, draft)}
                  // From the assistant the route is always new: nothing is deleted (#165).
                  onReplaceProfile={(existingId, draft) =>
                    routeProfiles.replaceProfile(existingId, draft, null)
                  }
                />
              }
              profilePicker={
                <RouteProfilePicker
                  profiles={pickerProfiles}
                  selectedId={profile?.id ?? null}
                  isEditable={routeProfiles.isEditable}
                  loadFailed={routeProfiles.loadFailed}
                  onSelect={selectProfile}
                  onSave={saveProfile}
                  onDelete={deleteProfile}
                  onReplace={routeProfiles.replaceProfile}
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
                        adjustment?.after.weights ??
                        (isRecommended
                          ? routePlanner.comparison.recommendation?.weights
                          : profile?.weights)
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
