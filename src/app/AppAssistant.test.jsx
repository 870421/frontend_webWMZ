import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App.jsx';
import { askRouteAssistant } from '../services/api/routeAssistantApi.js';
import { listRouteProfiles } from '../services/api/routeProfilesApi.js';
import {
  listRecentPlaces,
  listRouteFavorites,
  recordRecentPlaces,
} from '../services/api/routeHistoryApi.js';
import { getFastestRoute } from '../services/api/routesApi.js';

// The route assistant (PBI-9.2) inside the app: the API is simulated.
jest.mock('../services/api/geocodingApi.js', () => ({
  autocompletePlaces: jest.fn(),
  reversePlace: jest.fn().mockResolvedValue({ place: null }),
}));
jest.mock('../services/api/routesApi.js', () => ({
  getFastestRoute: jest.fn(),
  getRecommendedRoute: jest.fn(),
  getWeightedRouteComparison: jest.fn(),
}));
jest.mock('../services/api/routeAssistantApi.js', () => ({ askRouteAssistant: jest.fn() }));
jest.mock('../services/api/routeHistoryApi.js', () => ({
  listRecentPlaces: jest.fn(),
  listRouteFavorites: jest.fn(),
  recordRecentPlaces: jest.fn(),
  clearRecentPlaces: jest.fn(),
  addRouteFavorite: jest.fn(),
  removeRouteFavorite: jest.fn(),
}));
jest.mock('../services/api/routeProfilesApi.js', () => ({
  listRouteProfiles: jest.fn(),
  createRouteProfile: jest.fn(),
  updateRouteProfile: jest.fn(),
  deleteRouteProfile: jest.fn(),
}));
jest.mock('../features/weather/WeatherPanel.jsx', () => ({
  WeatherPanel: () => <section data-testid="weather-panel" />,
}));
jest.mock('../features/map/MapView.jsx', () => ({
  MapView: ({ onSelectPoint, fastestRoute, shadedRoute, selectedRouteType }) => {
    let geometry = 'none';
    if (fastestRoute) geometry = JSON.stringify(fastestRoute.geometry.coordinates);
    if (selectedRouteType === 'shaded' && shadedRoute) {
      geometry = JSON.stringify(shadedRoute.geometry.coordinates);
    }
    return (
      <div data-testid="map-view">
        <button onClick={() => onSelectPoint({ lat: 41.65, lng: -0.89, source: 'map' })}>
          Select map point
        </button>
        <span data-testid="route-geometry">{geometry}</span>
      </div>
    );
  },
}));

const NO_WEIGHTS = { shade: 0, sun: 0, wind: 0, vegetation: 0 };
const PROFILES = [
  { id: 1, name: 'Rápida', presetKey: 'fastest', weights: { shade: 0, sun: 0 } },
  { id: 2, name: 'Sombreada', presetKey: 'shaded', weights: { shade: 50, sun: 0 } },
].map((profile) => ({ ...profile, maxDetourPercentage: 25 }));
const line = (coordinates, distance, duration, shadePercentage) => ({
  geometry: { type: 'LineString', coordinates },
  distance,
  duration,
  exposure: { status: 'available', shadePercentage, sunPercentage: 100 - shadePercentage },
});
const FASTEST = line(
  [
    [-0.89, 41.65],
    [-0.88, 41.66],
  ],
  1000,
  600,
  20
);
const SHADED = line(
  [
    [-0.89, 41.65],
    [-0.87, 41.67],
  ],
  1100,
  700,
  70
);
const SHADE_SETTING = { weights: { ...NO_WEIGHTS, shade: 50 }, maxDetourPercentage: 35 };
const APPLIED = {
  assistant: {
    status: 'applied',
    explanation: 'Busco sombra y acepto hasta un 35 % más de tiempo.',
    before: { weights: NO_WEIGHTS, maxDetourPercentage: 25 },
    after: SHADE_SETTING,
    changes: [
      { factor: 'shade', before: 0, after: 50 },
      { factor: 'maxDetourPercentage', before: 25, after: 35 },
    ],
  },
  comparison: {
    status: 'selected',
    fastest: FASTEST,
    shaded: SHADED,
    additionalDurationSeconds: 100,
    shadeImprovementPercentagePoints: 50,
  },
};

async function calculateFastestRoute(user) {
  render(<App />);
  await user.click(screen.getByText('Select map point'));
  await user.click(screen.getByText('Select map point'));
  await screen.findByRole('button', { name: 'Sombreada' });
  await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));
  await screen.findByLabelText('Pide un ajuste de la ruta');
}

async function ask(user, text) {
  const field = screen.getByLabelText('Pide un ajuste de la ruta');
  await user.clear(field);
  await user.type(field, text);
  await user.click(screen.getByRole('button', { name: 'Ajustar' }));
}

const shownGeometry = () => screen.getByTestId('route-geometry').textContent;

describe('App with the route assistant', () => {
  beforeEach(() => {
    getFastestRoute.mockReset().mockResolvedValue(FASTEST);
    askRouteAssistant.mockReset();
    listRouteProfiles.mockReset().mockResolvedValue(PROFILES);
    listRecentPlaces.mockReset().mockResolvedValue([]);
    listRouteFavorites.mockReset().mockResolvedValue([]);
    recordRecentPlaces.mockReset().mockResolvedValue([]);
  });

  it('is offered only once there is a route', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Sombreada' });
    expect(screen.queryByLabelText('Pide un ajuste de la ruta')).not.toBeInTheDocument();
  });

  it('applies the new weights, shows the new route and what changed', async () => {
    const user = userEvent.setup();
    askRouteAssistant.mockResolvedValue(APPLIED);
    await calculateFastestRoute(user);

    await ask(user, 'prefiero la sombra aunque tarde más');

    // The current weights of "Rápida", without a date: the backend uses now.
    expect(askRouteAssistant).toHaveBeenCalledWith(
      {
        origin: expect.objectContaining({ lat: 41.65, lng: -0.89 }),
        destination: expect.objectContaining({ lat: 41.65, lng: -0.89 }),
        message: 'prefiero la sombra aunque tarde más',
        weights: NO_WEIGHTS,
        maxDetourPercentage: 25,
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(await screen.findByText(APPLIED.assistant.explanation)).toBeInTheDocument();
    expect(shownGeometry()).toBe(JSON.stringify(SHADED.geometry.coordinates));
    const changes = screen.getByRole('list', { name: 'Pesos cambiados por el asistente' });
    expect(within(changes).getByText('Neutro → Sombra 50 %')).toBeInTheDocument();
    expect(screen.getByText('70 % de sombra')).toBeInTheDocument();
  });

  it('a second request starts from the weights the assistant applied', async () => {
    const user = userEvent.setup();
    askRouteAssistant.mockResolvedValue(APPLIED);
    await calculateFastestRoute(user);
    await ask(user, 'prefiero la sombra');
    await screen.findByText(APPLIED.assistant.explanation);

    await ask(user, 'y evita el viento');

    expect(askRouteAssistant).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'y evita el viento', ...SHADE_SETTING }),
      expect.anything()
    );
  });

  it('an error keeps the route on screen', async () => {
    const user = userEvent.setup();
    askRouteAssistant.mockRejectedValue(
      Object.assign(
        new Error('Has hecho muchas peticiones seguidas al asistente. Espera un minuto.'),
        {
          status: 429,
        }
      )
    );
    await calculateFastestRoute(user);
    const before = shownGeometry();

    await ask(user, 'sombra');

    expect(await screen.findByText(/Espera un minuto/)).toBeInTheDocument();
    expect(shownGeometry()).toBe(before);
    expect(screen.getByRole('button', { name: 'Iniciar ruta' })).toBeInTheDocument();
  });

  it('an error after an adjustment keeps the adjusted route and its weights', async () => {
    const user = userEvent.setup();
    askRouteAssistant
      .mockResolvedValueOnce(APPLIED)
      .mockRejectedValueOnce(
        new Error('El asistente no está disponible ahora mismo. Tu ruta no ha cambiado.')
      );
    await calculateFastestRoute(user);
    await ask(user, 'sombra');
    await screen.findByText(APPLIED.assistant.explanation);

    await ask(user, 'ahora al sol');

    expect(await screen.findByText(/Tu ruta no ha cambiado/)).toBeInTheDocument();
    expect(shownGeometry()).toBe(JSON.stringify(SHADED.geometry.coordinates));
    expect(screen.getByText(APPLIED.assistant.explanation)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar como ruta' })).toBeInTheDocument();
  });

  it('a request it does not understand keeps the route and says so', async () => {
    const user = userEvent.setup();
    askRouteAssistant.mockResolvedValue({
      assistant: {
        status: 'not_understood',
        message: 'No he entendido la petición.',
        before: { weights: NO_WEIGHTS, maxDetourPercentage: 25 },
        after: null,
        changes: [],
      },
      comparison: null,
    });
    await calculateFastestRoute(user);
    const before = shownGeometry();

    await ask(user, 'cuéntame un chiste');

    expect(await screen.findByText('No he entendido la petición.')).toBeInTheDocument();
    expect(shownGeometry()).toBe(before);
  });

  it('choosing another route type leaves the assistant answer behind', async () => {
    const user = userEvent.setup();
    askRouteAssistant.mockResolvedValue(APPLIED);
    await calculateFastestRoute(user);
    await ask(user, 'sombra');
    await screen.findByText(APPLIED.assistant.explanation);

    await user.click(screen.getByRole('button', { name: 'Sombreada' }));

    expect(screen.queryByText(APPLIED.assistant.explanation)).not.toBeInTheDocument();
    expect(shownGeometry()).toBe('none');
  });
});
