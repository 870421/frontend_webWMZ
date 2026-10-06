import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.jsx';
import { getFastestRoute } from '../services/api/routesApi.js';

jest.mock('../services/api/routesApi.js', () => ({
  getFastestRoute: jest.fn()
}));

jest.mock('../features/map/MapView.jsx', () => ({
  MapView: ({ origin, destination, onSelectPoint, route }) => <div data-testid="map-view">
    <button onClick={() => onSelectPoint({ lat: 41.65, lng: -0.89, source: 'map' })}>Select map point</button>
    <span data-testid="origin-marker">{origin ? origin.lat : 'none'}</span>
    <span data-testid="destination-marker">{destination ? destination.lat : 'none'}</span>
    <span data-testid="route-geometry">
      {route ? JSON.stringify(route.geometry.coordinates) : 'none'}
    </span>
  </div>
}));

describe('App', () => {
  const originalLocation = navigator.geolocation;
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalLocation });
  });

  beforeEach(() => {
    getFastestRoute.mockReset();
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
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: jest.fn((callback) => { success = callback; })
    } });
    render(<App />);
    const position = { coords: { latitude: 42, longitude: -1 } };
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
    expect(screen.getByTestId('destination-marker')).toHaveTextContent('42');
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación actual asignada como destino');
    await user.clear(screen.getByLabelText('Destino'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('requests the fastest route with the selected points', async () => {
    const user = userEvent.setup();
    getFastestRoute.mockResolvedValue({
      geometry: { type: 'LineString', coordinates: [[-0.89, 41.65], [-0.89, 41.65]] },
      distance: 0,
      duration: 0
    });
    render(<App />);

    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByText('Select map point'));
    await user.click(screen.getByRole('button', { name: 'Calcular ruta' }));

    expect(getFastestRoute).toHaveBeenCalledWith({
      origin: { lat: 41.65, lng: -0.89, source: 'map' },
      destination: { lat: 41.65, lng: -0.89, source: 'map' }
    }, { signal: expect.any(AbortSignal) });
    expect(await screen.findByText('0 min')).toBeInTheDocument();
    expect(screen.getByText('0 m')).toBeInTheDocument();
    expect(screen.getByTestId('route-geometry')).toHaveTextContent(
      JSON.stringify([[-0.89, 41.65], [-0.89, 41.65]])
    );
  });

  it('shows loading and a comprehensible error when route calculation fails', async () => {
    const user = userEvent.setup();
    let rejectRequest;
    getFastestRoute.mockReturnValue(new Promise((_resolve, reject) => {
      rejectRequest = reject;
    }));
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
});
