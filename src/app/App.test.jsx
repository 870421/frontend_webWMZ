import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.jsx';

jest.mock('../features/map/MapView.jsx', () => ({
  MapView: ({ origin, destination, onSelectPoint }) => <div data-testid="map-view">
    <button onClick={() => onSelectPoint({ lat: 41.65, lng: -0.89, source: 'map' })}>Select map point</button>
    <span data-testid="origin-marker">{origin ? origin.lat : 'none'}</span>
    <span data-testid="destination-marker">{destination ? destination.lat : 'none'}</span>
  </div>
}));

describe('App', () => {
  const originalLocation = navigator.geolocation;
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalLocation });
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
});
