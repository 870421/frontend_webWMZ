import { askRouteAssistant } from './routeAssistantApi.js';

const NO_WEIGHTS = { shade: 0, sun: 0, wind: 0, vegetation: 0 };
const REQUEST = {
  origin: { lat: 41.65, lng: -0.89, label: 'Plaza del Pilar' },
  destination: { lat: 41.64, lng: -0.88, label: 'Casa' },
  message: 'prefiero la sombra aunque tarde más',
  weights: NO_WEIGHTS,
  maxDetourPercentage: 25,
};
const route = (coordinates, distance, duration, shadePercentage) => ({
  geometry: { type: 'LineString', coordinates },
  distance,
  duration,
  exposure: { status: 'available', shadePercentage, sunPercentage: 100 - shadePercentage },
});
const FASTEST = route(
  [
    [-0.89, 41.65],
    [-0.88, 41.64],
  ],
  1000,
  600,
  20
);
const SELECTED = route(
  [
    [-0.89, 41.65],
    [-0.87, 41.64],
  ],
  1200,
  700,
  70
);
const APPLIED = {
  assistant: {
    status: 'applied',
    explanation: 'Busco sombra y acepto hasta un 35 % más de tiempo.',
    before: { weights: NO_WEIGHTS, maxDetourPercentage: 25 },
    after: { weights: { ...NO_WEIGHTS, shade: 50 }, maxDetourPercentage: 35 },
    changes: [
      { factor: 'shade', before: 0, after: 50 },
      { factor: 'maxDetourPercentage', before: 25, after: 35 },
    ],
  },
  comparison: {
    status: 'selected',
    fastest: FASTEST,
    selected: SELECTED,
    additionalDurationSeconds: 100,
    shadeChangePercentagePoints: 50,
  },
};

const respond = (body, status = 200) =>
  jest.fn().mockResolvedValue({ ok: status < 300, status, json: async () => body });

describe('askRouteAssistant', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends only the points, the request and the current weights', async () => {
    global.fetch = respond(APPLIED);
    await askRouteAssistant({
      ...REQUEST,
      date: '2026-07-15',
      time: '13:00',
      timeZone: 'Europe/Madrid',
    });

    expect(global.fetch.mock.calls[0][0]).toMatch(/\/routes\/assistant$/);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      origin: { lat: 41.65, lng: -0.89 },
      destination: { lat: 41.64, lng: -0.88 },
      date: '2026-07-15',
      time: '13:00',
      timeZone: 'Europe/Madrid',
      message: 'prefiero la sombra aunque tarde más',
      weights: NO_WEIGHTS,
      maxDetourPercentage: 25,
    });
  });

  it('returns the applied weights and the recalculated comparison as the app uses it', async () => {
    global.fetch = respond(APPLIED);
    const { assistant, comparison } = await askRouteAssistant(REQUEST);

    expect(assistant).toEqual(APPLIED.assistant);
    expect(comparison).toMatchObject({
      status: 'selected',
      fastest: FASTEST,
      shaded: SELECTED,
      shadeImprovementPercentagePoints: 50,
    });
  });

  it('a notice comes without a comparison', async () => {
    const notice = {
      assistant: {
        status: 'not_understood',
        message: 'No he entendido la petición.',
        before: { weights: NO_WEIGHTS, maxDetourPercentage: 25 },
        after: null,
        changes: [],
      },
      comparison: null,
    };
    global.fetch = respond(notice);

    await expect(askRouteAssistant(REQUEST)).resolves.toEqual(notice);
  });

  it('a limit shows the message of the backend, that says which limit', async () => {
    global.fetch = respond(
      {
        error: {
          message: 'Has llegado al máximo de peticiones a Cierzo de hoy. Vuelve mañana.',
        },
      },
      429
    );

    await expect(askRouteAssistant(REQUEST)).rejects.toMatchObject({
      status: 429,
      message: 'Has llegado al máximo de peticiones a Cierzo de hoy. Vuelve mañana.',
    });
  });

  it('a failure to recalculate says the route did not change', async () => {
    global.fetch = respond({ error: { message: 'Bad gateway' } }, 502);
    await expect(askRouteAssistant(REQUEST)).rejects.toThrow('Tu ruta no ha cambiado.');
  });

  it.each([
    ['an unknown status', { ...APPLIED, assistant: { ...APPLIED.assistant, status: 'magic' } }],
    [
      'applied weights out of range',
      {
        ...APPLIED,
        assistant: {
          ...APPLIED.assistant,
          after: { weights: { ...NO_WEIGHTS, shade: 150 }, maxDetourPercentage: 25 },
        },
      },
    ],
    ['applied without a valid route', { ...APPLIED, comparison: { status: 'selected' } }],
  ])('rejects %s', async (_case, body) => {
    global.fetch = respond(body);
    await expect(askRouteAssistant(REQUEST)).rejects.toThrow(
      'Cierzo ha devuelto una respuesta no válida'
    );
  });

  it('its own messages speak of the assistant by its name, Cierzo (#181)', async () => {
    global.fetch = respond({}, 401);
    await expect(askRouteAssistant(REQUEST)).rejects.toThrow('para usar a Cierzo');
    global.fetch = respond({}, 429);
    await expect(askRouteAssistant(REQUEST)).rejects.toThrow(
      'Has hecho muchas peticiones a Cierzo'
    );
    global.fetch = respond({}, 500);
    await expect(askRouteAssistant(REQUEST)).rejects.toThrow(
      'Cierzo no está disponible ahora mismo. Tu ruta no ha cambiado.'
    );
  });
});
