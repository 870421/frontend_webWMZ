import { render, screen } from '@testing-library/react';

import { NavigationMarker } from './NavigationMarker.jsx';

const mockSetView = jest.fn();
const mockMap = { setView: mockSetView, getZoom: () => 14 };

jest.mock('react-leaflet', () => ({
  CircleMarker: ({ center }) => <div data-center={center.join(',')} data-testid="position" />,
  useMap: () => mockMap,
}));

describe('NavigationMarker', () => {
  beforeEach(() => mockSetView.mockClear());

  it('draws nothing and does not move the map without a position', () => {
    render(<NavigationMarker position={null} />);

    expect(screen.queryByTestId('position')).not.toBeInTheDocument();
    expect(mockSetView).not.toHaveBeenCalled();
  });

  it('draws the position and makes the map follow it', () => {
    const { rerender } = render(<NavigationMarker position={{ lat: 41.65, lng: -0.89 }} />);

    expect(screen.getByTestId('position')).toHaveAttribute('data-center', '41.65,-0.89');
    expect(mockSetView).toHaveBeenLastCalledWith([41.65, -0.89], 17, { animate: true });

    rerender(<NavigationMarker position={{ lat: 41.66, lng: -0.89 }} />);
    expect(mockSetView).toHaveBeenCalledTimes(2);
    expect(mockSetView).toHaveBeenLastCalledWith([41.66, -0.89], 17, { animate: true });
  });
});
