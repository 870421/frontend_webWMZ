// Initial values, chosen for the accuracy of a phone GPS between buildings (ADR-018).
export const OFF_ROUTE_DISTANCE_M = 40;
export const ARRIVAL_DISTANCE_M = 20;
// The position may jump back a little, but a route that passes twice near the same place must not
// send the user back to the earlier pass.
const BACKTRACK_TOLERANCE_M = 30;
// Until this far, the first step ("walk north-east along...") is the one that helps.
const START_DISTANCE_M = 15;

const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Metres east and north of the reference. Enough for the short distances of a walking route.
function toLocalMetres([lng, lat], [refLng, refLat]) {
  return [
    toRadians(lng - refLng) * Math.cos(toRadians(refLat)) * EARTH_RADIUS_M,
    toRadians(lat - refLat) * EARTH_RADIUS_M,
  ];
}

export function distanceBetweenM(a, b) {
  return Math.hypot(...toLocalMetres(a, b));
}

function cumulativeDistances(coordinates) {
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distanceBetweenM(coordinates[i - 1], coordinates[i]));
  }
  return cumulative;
}

function nearestOnRoute(coordinates, cumulative, point, minAlongM) {
  let nearest = { distanceM: Infinity, alongM: minAlongM };
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    if (cumulative[i + 1] >= minAlongM) {
      const [bx, by] = toLocalMetres(coordinates[i + 1], coordinates[i]);
      const [px, py] = toLocalMetres(point, coordinates[i]);
      const squaredLength = bx * bx + by * by;
      const fraction =
        squaredLength === 0 ? 0 : Math.min(1, Math.max(0, (px * bx + py * by) / squaredLength));
      const distanceM = Math.hypot(px - fraction * bx, py - fraction * by);
      if (distanceM < nearest.distanceM) {
        nearest = {
          distanceM,
          alongM: cumulative[i] + fraction * (cumulative[i + 1] - cumulative[i]),
        };
      }
    }
  }
  return nearest;
}

function nextInstruction(steps, cumulative, alongM) {
  if (!steps?.length) return { instruction: null, distanceToInstructionM: null };
  const stepEnd = (step) => cumulative[Math.min(step.wayPoints[1], cumulative.length - 1)];
  const index = steps.findIndex((step) => stepEnd(step) > alongM);
  const current = index === -1 ? steps.length - 1 : index;
  const untilEndOfStep = Math.max(0, stepEnd(steps[current]) - alongM);
  if (current === 0 && alongM < START_DISTANCE_M) {
    return { instruction: steps[0].instruction, distanceToInstructionM: null };
  }
  // Each instruction describes the manoeuvre at the start of its step: while walking one step, the
  // useful one is that of the next step.
  const next = steps[current + 1] ?? steps[current];
  return { instruction: next.instruction, distanceToInstructionM: untilEndOfStep };
}

/**
 * Where a position is on the route and what the user has to do next.
 * previousAlongM is the alongM of the previous position, 0 at the start.
 */
export function getNavigationProgress(route, { lat, lng }, previousAlongM = 0) {
  const { coordinates } = route.geometry;
  const point = [lng, lat];
  const cumulative = cumulativeDistances(coordinates);
  const totalM = cumulative[cumulative.length - 1];
  const minAlongM = Math.max(0, previousAlongM - BACKTRACK_TOLERANCE_M);
  const nearest = nearestOnRoute(coordinates, cumulative, point, minAlongM);
  const isOffRoute = nearest.distanceM > OFF_ROUTE_DISTANCE_M;
  // Off the route, the progress stays where it was.
  const alongM = isOffRoute ? previousAlongM : nearest.alongM;
  const remainingM = Math.max(0, totalM - alongM);
  const distanceToEndM = distanceBetweenM(point, coordinates[coordinates.length - 1]);

  return {
    alongM,
    distanceToRouteM: nearest.distanceM,
    isOffRoute,
    hasStarted: previousAlongM > 0 || (!isOffRoute && alongM > 0),
    hasArrived: distanceToEndM <= ARRIVAL_DISTANCE_M && remainingM <= 2 * ARRIVAL_DISTANCE_M,
    remainingM,
    // ORS estimates the duration of the whole route: the remaining part gets its share.
    remainingSeconds: totalM > 0 ? route.duration * (remainingM / totalM) : 0,
    ...nextInstruction(route.steps, cumulative, alongM),
  };
}
