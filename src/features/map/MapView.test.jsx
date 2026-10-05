import { render, screen } from '@testing-library/react';

import { MapView } from './MapView.jsx';

jest.mock('react-leaflet', () => ({
  Circle: ({ center, radius, interactive }) => <div data-testid="accuracy-circle"
    data-center={center.join(',')} data-radius={radius} data-interactive={String(interactive)} />,
  MapContainer: ({ children, center, zoom }) => (
    <div data-center={center.join(',')} data-testid="map-container" data-zoom={zoom}>
      {children}
    </div>
  ),
  Marker: ({ children, position }) => (
    <div data-position={position.join(',')} data-testid="marker">
      {children}
    </div>
  ),
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({
    flyTo: jest.fn(),
    getZoom: () => 13
  }),
  useMapEvents: jest.fn(),
  TileLayer: ({ url }) => <div data-testid="tile-layer" data-url={url} />,
  ZoomControl: () => <div data-testid="zoom-control" />
}));

describe('MapView', () => {
  it('shows a fixed 50-metre reference circle and removes it when corrected on the map', () => {
    const { rerender } = render(<MapView origin={{ lat: 41.65, lng: -0.89, source: 'device', accuracy: 500 }} />);
    expect(screen.getByTestId('accuracy-circle')).toHaveAttribute('data-radius', '50');
    expect(screen.getByTestId('accuracy-circle')).toHaveAttribute('data-center', '41.65,-0.89');
    expect(screen.getByTestId('accuracy-circle')).toHaveAttribute('data-interactive', 'false');
    expect(screen.getByText(/Círculo de referencia de 50 m/)).toBeInTheDocument();
    rerender(<MapView origin={{ lat: 41.65, lng: -0.89, source: 'map' }} />);
    expect(screen.queryByTestId('accuracy-circle')).not.toBeInTheDocument();
  });
  it('renders a Leaflet map centered on Zaragoza with OpenStreetMap tiles', () => {
    render(<MapView />);

    expect(screen.getByTestId('map-container')).toHaveAttribute('data-center', '41.6488,-0.8891');
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-zoom', '13');
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-url',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    );
  });

  it('renders origin and destination markers', () => {
    render(
      <MapView
        activePoint="destination"
        destination={{ lat: 41.66, lng: -0.88, source: 'map' }}
        onSelectPoint={jest.fn()}
        origin={{ lat: 41.65, lng: -0.89, source: 'map' }}
      />
    );

    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(screen.getAllByText('Origen')).toHaveLength(2);
    expect(screen.getAllByText('Destino')).toHaveLength(2);
    expect(screen.getByText('Toca el mapa para fijar el destino.')).toBeInTheDocument();
  });
});
