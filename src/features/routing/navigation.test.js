import { distanceBetweenM, getNavigationProgress } from './navigation.js';

// An L-shaped route: about 170 m east, then about 220 m north.
const LAT = 41.65;
const coordinates = [
  [-0.89, LAT],
  [-0.888, LAT],
  [-0.888, LAT + 0.002],
];
const step = (instruction, wayPoints) => ({ instruction, name: null, wayPoints });
const route = {
  geometry: { type: 'LineString', coordinates },
  duration: 300,
  steps: [
    step('Camina hacia el este', [0, 1]),
    step('Gire a la izquierda a Calle Norte', [1, 2]),
    step('Llegar a su destino', [2, 2]),
  ],
};
const eastLeg = distanceBetweenM(coordinates[0], coordinates[1]);
const northLeg = distanceBetweenM(coordinates[1], coordinates[2]);
const total = eastLeg + northLeg;

describe('getNavigationProgress', () => {
  it('shows the first step at the start', () => {
    const progress = getNavigationProgress(route, { lat: LAT, lng: -0.89 });

    expect(progress).toMatchObject({
      isOffRoute: false,
      hasArrived: false,
      instruction: 'Camina hacia el este',
      distanceToInstructionM: null,
    });
    expect(progress.alongM).toBeCloseTo(0, 5);
    expect(progress.remainingM).toBeCloseTo(total, 5);
    expect(progress.remainingSeconds).toBeCloseTo(300, 5);
  });

  it('announces the next turn and how far it is while walking a step', () => {
    const progress = getNavigationProgress(route, { lat: LAT, lng: -0.889 });

    expect(progress.instruction).toBe('Gire a la izquierda a Calle Norte');
    expect(progress.distanceToInstructionM).toBeCloseTo(eastLeg / 2, 0);
    expect(progress.remainingM).toBeCloseTo(eastLeg / 2 + northLeg, 0);
    expect(progress.remainingSeconds).toBeCloseTo(300 * (progress.remainingM / total), 5);
  });

  it('moves on to the next step after the turn', () => {
    const progress = getNavigationProgress(route, { lat: LAT + 0.001, lng: -0.888 }, eastLeg);

    expect(progress.instruction).toBe('Llegar a su destino');
    expect(progress.distanceToInstructionM).toBeCloseTo(northLeg / 2, 0);
  });

  it('tolerates GPS noise next to the route', () => {
    const progress = getNavigationProgress(route, { lat: LAT + 0.0002, lng: -0.889 });

    expect(progress.distanceToRouteM).toBeCloseTo(22, 0);
    expect(progress.isOffRoute).toBe(false);
  });

  it('detects leaving the route and keeps the progress made', () => {
    const progress = getNavigationProgress(route, { lat: LAT - 0.001, lng: -0.889 }, 60);

    expect(progress.isOffRoute).toBe(true);
    expect(progress.alongM).toBe(60);
    expect(progress.hasStarted).toBe(true);
  });

  it('knows the user has not reached the route yet', () => {
    const progress = getNavigationProgress(route, { lat: LAT - 0.01, lng: -0.89 });

    expect(progress).toMatchObject({ isOffRoute: true, hasStarted: false, alongM: 0 });
  });

  it('arrives within the distance of the end, not before', () => {
    const near = getNavigationProgress(route, { lat: LAT + 0.00195, lng: -0.888 }, total - 10);
    const before = getNavigationProgress(route, { lat: LAT + 0.0015, lng: -0.888 }, total - 60);

    expect(near.hasArrived).toBe(true);
    expect(before.hasArrived).toBe(false);
  });

  it('does not arrive at the start of a route that ends where it begins', () => {
    const loop = {
      ...route,
      geometry: {
        type: 'LineString',
        coordinates: [...coordinates, [-0.89, LAT + 0.002], [-0.89, LAT]],
      },
    };

    expect(getNavigationProgress(loop, { lat: LAT, lng: -0.89 }).hasArrived).toBe(false);
  });

  it('does not jump to a later pass of a route that goes and comes back', () => {
    const outAndBack = {
      ...route,
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, LAT],
          [-0.888, LAT],
          [-0.89, LAT + 0.0001],
        ],
      },
      steps: [],
    };
    const legM = distanceBetweenM([-0.89, LAT], [-0.888, LAT]);

    // Close to both passes: at the start of the walk, it is the first one.
    const going = getNavigationProgress(outAndBack, { lat: LAT, lng: -0.8895 + 0.0005 }, 10);
    // Once on the way back, the same place belongs to the second pass.
    const returning = getNavigationProgress(
      outAndBack,
      { lat: LAT + 0.00008, lng: -0.8895 + 0.0005 },
      2 * legM - 10
    );

    expect(going.alongM).toBeLessThan(legM);
    expect(returning.alongM).toBeGreaterThan(legM);
  });

  it('works without steps', () => {
    const progress = getNavigationProgress({ ...route, steps: [] }, { lat: LAT, lng: -0.889 });

    expect(progress).toMatchObject({ instruction: null, distanceToInstructionM: null });
    expect(progress.remainingM).toBeGreaterThan(0);
  });
});
