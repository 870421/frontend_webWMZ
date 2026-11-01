import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App.jsx';
import { getFastestRoute, getShadedRouteComparison } from '../services/api/routesApi.js';

jest.mock('../services/api/geocodingApi.js', () => ({
  autocompletePlaces: jest.fn(),
  reversePlace: jest.fn().mockResolvedValue({ place: null }),
}));

jest.mock('../services/api/routesApi.js', () => ({
  getFastestRoute: jest.fn(),
  getShadedRouteComparison: jest.fn(),
}));

jest.mock('../features/map/MapView.jsx', () => ({
  MapView: ({
    origin,
    destination,
    onSelectPoint,
    fastestRoute,
    shadedRoute,
    selectedRouteType,
    selectedStepGeometry,
  }) => {
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
        <span data-testid="origin-marker">{origin ? origin.lat : 'none'}</span>
        <span data-testid="destination-marker">{destination ? destination.lat : 'none'}</span>
        <span data-testid="route-geometry">{geometry}</span>
        <span data-testid="step-geometry">
          {selectedStepGeometry ? JSON.stringify(selectedStepGeometry.coordinates) : 'none'}
        </span>
      </div>
    );
  },
}));

describe('App', () => {
  const originalLocation = navigator.geolocation;
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    getFastestRoute.mockReset();
    getShadedRouteComparison.mockReset();
  });

  it('renders the base application shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'WeatherMapZ' })).toBeInTheDocument();
    expect(screen.getByLabelText('Controles de ruta')).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('keeps map selection, editable inputs and markers synchronized', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Select map point'));
    expect(screen.getByLabelText('Origen')).toHaveValue('41.65000, -0.89000');
    await user.click(screen.getByText('Select map point'));
    expect(screen.getByTestId('destination-marker')).toHaveTextContent('41.65');
    await user.clear(screen.getByLabelText('Origen'));
    expect(screen.getByTestId('origin-marker')).toHaveTextContent('none');
    await user.type(screen.getByLabelText('Origen'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Limpiar selección' }));
    expect(screen.getByLabelText('Origen')).toHaveValue('');
    expect(screen.getByLabelText('Destino')).toHaveValue('');
    expect(screen.getByTestId('destination-marker')).toHaveTextContent('none');
  });

  it('ignores GPS after reset or a newer map selection and clears old success messages', async () => {
    const user = userEvent.setup();
    let success;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((callback) => {
          success = callback;
        }),
      },
    });
    render(<App />);
    const position = { coords: { latitude: 41.7, longitude: -1 } };
    await user.click(screen.getByLabelText('Usar GPS para origen'));
    await user.click(screen.getByRole('button', { name: 'Limpiar selección' }));
    act(() => success(position));
    expect(screen.getByTestId('origin-marker')).toHaveTextContent('none');
    await user.click(screen.getByLabelText('Usar GPS para origen'));
    await user.click(screen.getByText('Select map point'));
    act(() => success(position));
    expect(screen.getByTestId('origin-marker')).toHaveTextContent('41.65');
    await user.click(screen.getByLabelText('Usar GPS para destino'));
    act(() => success(position));
    expect(screen.getByTestId('destination-marker')).toHaveTextContent('41.7');
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación actual asignada como destino');
    await user.clear(screen.getByLabelText('Destino'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not accept a GPS position outside Zaragoza', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: jest.fn((onSuccess) =>
          onSuccess({ coords: { latitude: 40.4168, longitude: -3.7038 } })
        ),
      },
    });
    render(<App />);

    await user.click(screen.getByLabelText('Usar GPS para origen'));

    expect(screen.getByTestId('origin-marker')).toHaveTextContent('none');
    expect(screen.getByRole('alert')).toHaveTextContent('solo funciona dentro de Zaragoza');
  });

  it('highlights on the map the part of the route of the chosen step', async () => {
    const user = userEvent.setup();
    getFastestRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.88, 41.65],
          [-0.87, 41.65],
        ],
      },
      distance: 200,
      duration: 100,
      steps: [
        { instruction: 'Primero', name: null, distance: 100, duration: 50, wayPoints: [0, 1] },
        { instruction: 'Después', name: null, distance: 100, duration: 50, wayPoints: [1, 2] },
      ],
    });
    render(<App />);
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));

    await user.click(await screen.findByRole('button', { name: 'Ver recorrido' }));
    expect(screen.getByTestId('step-geometry')).toHaveTextContent('none');

    await user.click(screen.getByRole('button', { name: /Después/ }));

    expect(screen.getByRole('button', { name: /Después/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('step-geometry')).toHaveTextContent(
      JSON.stringify([
        [-0.88, 41.65],
        [-0.87, 41.65],
      ])
    );
  });

  describe('walking a route', () => {
    const fastest = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.888, 41.65],
        ],
      },
      distance: 170,
      duration: 120,
      steps: [
        { instruction: 'Camina hacia el este', name: null, distance: 170, wayPoints: [0, 1] },
        { instruction: 'Llegar a su destino', name: null, distance: 0, wayPoints: [1, 1] },
      ],
    };
    let onPosition;
    let clearWatch;

    async function calculateAndStart(user) {
      getFastestRoute.mockResolvedValue(fastest);
      clearWatch = jest.fn();
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          clearWatch,
          watchPosition: jest.fn((success) => {
            onPosition = success;
            return 1;
          }),
        },
      });
      render(<App />);
      await user.click(screen.getByText('Select map point'));
      await user.click(screen.getByText('Select map point'));
      await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));
      await user.click(await screen.findByRole('button', { name: 'Iniciar ruta' }));
    }

    it('replaces the search with the instructions until the user finishes', async () => {
      const user = userEvent.setup();
      await calculateAndStart(user);

      expect(screen.getByText('Buscando tu ubicación…')).toBeInTheDocument();
      expect(screen.queryByLabelText('Origen')).not.toBeInTheDocument();

      act(() => onPosition({ coords: { latitude: 41.65, longitude: -0.889 } }));
      expect(screen.getByText('Llegar a su destino')).toBeInTheDocument();
      expect(screen.getByText(/^En /)).toBeInTheDocument();

      act(() => onPosition({ coords: { latitude: 41.65, longitude: -0.888 } }));
      expect(screen.getByText('Has llegado a tu destino')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Terminar' }));

      expect(clearWatch).toHaveBeenCalledWith(1);
      expect(screen.getByLabelText('Origen')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar ruta' })).toBeInTheDocument();
    });

    it('does not change the route when the map is tapped while walking', async () => {
      const user = userEvent.setup();
      await calculateAndStart(user);

      const geometry = screen.getByTestId('route-geometry').textContent;
      await user.click(screen.getByText('Select map point'));

      expect(screen.getByTestId('route-geometry')).toHaveTextContent(geometry);
      expect(screen.getByText('Buscando tu ubicación…')).toBeInTheDocument();
    });
  });

  it('asks to calculate again after choosing the shaded type with only the fastest route', async () => {
    const user = userEvent.setup();
    getFastestRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.888, 41.65],
        ],
      },
      distance: 170,
      duration: 120,
      steps: [],
    });
    render(<App />);
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));
    await screen.findByRole('button', { name: 'Iniciar ruta' });

    await user.click(screen.getByRole('button', { name: 'Con sombra' }));

    expect(screen.getByRole('button', { name: 'Calcular Ruta Sombreada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar ruta' })).not.toBeInTheDocument();
  });

  it('requests the fastest route with the selected points', async () => {
    const user = userEvent.setup();
    getFastestRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.89, 41.65],
        ],
      },
      distance: 0,
      duration: 0,
    });
    render(<App />);

    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));

    expect(getFastestRoute).toHaveBeenCalledWith(
      {
        origin: { lat: 41.65, lng: -0.89, source: 'map' },
        destination: { lat: 41.65, lng: -0.89, source: 'map' },
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(await screen.findByText('0 min')).toBeInTheDocument();
    expect(screen.getByText('0 m')).toBeInTheDocument();
    expect(screen.getByTestId('route-geometry')).toHaveTextContent(
      JSON.stringify([
        [-0.89, 41.65],
        [-0.89, 41.65],
      ])
    );
  });

  it('shows loading and a comprehensible error when route calculation fails', async () => {
    const user = userEvent.setup();
    let rejectRequest;
    getFastestRoute.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      })
    );
    render(<App />);

    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));

    expect(screen.getByRole('button', { name: 'Calculando...' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Calculando la ruta más rápida');
    expect(screen.getByTestId('route-geometry')).toHaveTextContent('none');

    await act(async () => {
      rejectRequest(new Error('No se ha podido calcular la ruta. Inténtalo de nuevo.'));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido calcular la ruta');
    expect(screen.getByTestId('route-geometry')).toHaveTextContent('none');
  });

  it('calculates, compares and alternates a genuinely shaded route', async () => {
    const user = userEvent.setup();
    const fastest = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.88, 41.66],
        ],
      },
      distance: 1000,
      duration: 600,
      exposure: { status: 'available', shadePercentage: 20, sunPercentage: 80 },
    };
    const shaded = {
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.89, 41.65],
          [-0.87, 41.67],
        ],
      },
      distance: 1100,
      duration: 660,
      exposure: { status: 'available', shadePercentage: 70, sunPercentage: 30 },
    };
    getShadedRouteComparison.mockResolvedValue({
      status: 'selected',
      fastest,
      shaded,
      additionalDurationSeconds: 60,
      shadeImprovementPercentagePoints: 50,
    });
    render(<App />);

    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Con sombra' }));
    await user.clear(screen.getByLabelText('Fecha'));
    await user.type(screen.getByLabelText('Fecha'), '2026-06-21');
    await user.clear(screen.getByLabelText('Hora'));
    await user.type(screen.getByLabelText('Hora'), '14:00');
    await user.click(screen.getByRole('button', { name: 'Calcular Ruta Sombreada' }));

    expect(getShadedRouteComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-06-21',
        time: '14:00',
        timeZone: 'Europe/Madrid',
      }),
      { signal: expect.any(AbortSignal) }
    );
    expect(await screen.findByText('70 % de sombra')).toBeInTheDocument();
    expect(screen.getByTestId('route-geometry')).toHaveTextContent(
      JSON.stringify(shaded.geometry.coordinates)
    );
    await user.click(screen.getByRole('button', { name: /Más rápida 10 min/ }));
    expect(screen.getByTestId('route-geometry')).toHaveTextContent(
      JSON.stringify(fastest.geometry.coordinates)
    );
  });
});
