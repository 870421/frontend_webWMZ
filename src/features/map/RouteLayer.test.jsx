import { render, screen } from '@testing-library/react';

import { geometryToPositions, RouteLayer } from './RouteLayer.jsx';

const mockFitBounds = jest.fn();

jest.mock('react-leaflet', () => ({
  Polyline: ({ interactive, pathOptions, positions }) => (
    <div
      data-interactive={String(interactive)}
      data-options={JSON.stringify(pathOptions)}
      data-positions={JSON.stringify(positions)}
      data-testid="route-line"
    />
  ),
  useMap: () => ({ fitBounds: mockFitBounds }),
}));

describe('RouteLayer', () => {
  beforeEach(() => {
    mockFitBounds.mockClear();
  });

  test('convierte la geometría GeoJSON a coordenadas de Leaflet', () => {
    expect(
      geometryToPositions({
        type: 'LineString',
        coordinates: [
          [-0.8891, 41.6488],
          [-0.875, 41.656],
        ],
      })
    ).toEqual([
      [41.6488, -0.8891],
      [41.656, -0.875],
    ]);
  });

  test('dibuja la ruta rápida discontinua y encuadra toda la geometría', () => {
    const geometry = {
      type: 'LineString',
      coordinates: [
        [-0.8891, 41.6488],
        [-0.882, 41.652],
        [-0.875, 41.656],
      ],
    };

    render(<RouteLayer fastestGeometry={geometry} />);

    const routeLine = screen.getByTestId('route-line');
    expect(JSON.parse(routeLine.dataset.positions)).toEqual([
      [41.6488, -0.8891],
      [41.652, -0.882],
      [41.656, -0.875],
    ]);
    expect(JSON.parse(routeLine.dataset.options)).toEqual(
      expect.objectContaining({
        color: '#40566b',
        dashArray: '8 7',
        weight: 5,
      })
    );
    expect(mockFitBounds).toHaveBeenCalledWith(
      JSON.parse(routeLine.dataset.positions),
      expect.objectContaining({ padding: [48, 48] })
    );
  });

  test('sustituye el trazado al recibir una ruta nueva', () => {
    const { rerender } = render(
      <RouteLayer
        fastestGeometry={{
          type: 'LineString',
          coordinates: [
            [-0.9, 41.64],
            [-0.89, 41.65],
          ],
        }}
      />
    );

    rerender(
      <RouteLayer
        fastestGeometry={{
          type: 'LineString',
          coordinates: [
            [-0.88, 41.66],
            [-0.87, 41.67],
          ],
        }}
      />
    );

    expect(screen.getAllByTestId('route-line')).toHaveLength(1);
    expect(JSON.parse(screen.getByTestId('route-line').dataset.positions)).toEqual([
      [41.66, -0.88],
      [41.67, -0.87],
    ]);
    expect(mockFitBounds).toHaveBeenLastCalledWith(
      [
        [41.66, -0.88],
        [41.67, -0.87],
      ],
      expect.any(Object)
    );
  });

  test('no dibuja una geometría inválida', () => {
    render(<RouteLayer fastestGeometry={{ type: 'Point', coordinates: [-0.8891, 41.6488] }} />);

    expect(screen.queryByTestId('route-line')).not.toBeInTheDocument();
    expect(mockFitBounds).not.toHaveBeenCalled();
  });

  test('diferencia y encuadra conjuntamente la ruta rápida y la sombreada', () => {
    render(
      <RouteLayer
        fastestGeometry={{
          type: 'LineString',
          coordinates: [
            [-0.9, 41.64],
            [-0.89, 41.65],
          ],
        }}
        shadedGeometry={{
          type: 'LineString',
          coordinates: [
            [-0.9, 41.64],
            [-0.88, 41.66],
          ],
        }}
        selectedRouteType="shaded"
      />
    );

    const lines = screen.getAllByTestId('route-line');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0].dataset.options)).toMatchObject({
      dashArray: '8 7',
      opacity: 0.45,
    });
    expect(JSON.parse(lines[1].dataset.options)).toMatchObject({
      color: '#2faa73',
      weight: 6,
    });
    expect(mockFitBounds).toHaveBeenCalledWith(
      [
        [41.64, -0.9],
        [41.65, -0.89],
        [41.64, -0.9],
        [41.66, -0.88],
      ],
      expect.any(Object)
    );
  });
});
