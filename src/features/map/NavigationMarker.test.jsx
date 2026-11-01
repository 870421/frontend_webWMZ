import { render, screen } from '@testing-library/react';

import { NavigationMarker } from './NavigationMarker.jsx';

const mockSetView = jest.fn();
const mockMap = { setView: mockSetView, getZoom: () => 14 };
let mockMapEvents;

jest.mock('react-leaflet', () => ({
  CircleMarker: ({ center }) => <div data-center={center.join(',')} data-testid="position" />,
  useMap: () => mockMap,
  useMapEvents: (handlers) => {
    mockMapEvents = handlers;
  },
}));

describe('NavigationMarker', () => {
  beforeEach(() => mockSetView.mockClear());

  it('draws nothing and does not move the map without a position', () => {
    render(<NavigationMarker position={null} />);

    expect(screen.queryByTestId('position')).not.toBeInTheDocument();
    expect(mockSetView).not.toHaveBeenCalled();
  });

  it('draws the position and makes the map follow it', () => {
    const { rerender } = render(<NavigationMarker position={{ lat: 41.65, lng: -0.89 }} follow />);

    expect(screen.getByTestId('position')).toHaveAttribute('data-center', '41.65,-0.89');
    expect(mockSetView).toHaveBeenLastCalledWith([41.65, -0.89], 17, { animate: true });

    rerender(<NavigationMarker position={{ lat: 41.66, lng: -0.89 }} follow />);
    expect(mockSetView).toHaveBeenCalledTimes(2);
    expect(mockSetView).toHaveBeenLastCalledWith([41.66, -0.89], 17, { animate: true });
  });

  it('draws the position without moving the map when it must not follow', () => {
    render(<NavigationMarker position={{ lat: 41.65, lng: -0.89 }} />);

    expect(screen.getByTestId('position')).toBeInTheDocument();
    expect(mockSetView).not.toHaveBeenCalled();
  });

  it('goes back to the position when following resumes', () => {
    const position = { lat: 41.65, lng: -0.89 };
    const { rerender } = render(<NavigationMarker position={position} />);

    rerender(<NavigationMarker position={position} follow />);

    expect(mockSetView).toHaveBeenCalledTimes(1);
  });

  it('tells when the user drags the map, only if it was following', () => {
    const onUserDrag = jest.fn();
    const position = { lat: 41.65, lng: -0.89 };
    const { rerender } = render(<NavigationMarker position={position} onUserDrag={onUserDrag} />);

    mockMapEvents.dragstart();
    expect(onUserDrag).not.toHaveBeenCalled();

    rerender(<NavigationMarker position={position} follow onUserDrag={onUserDrag} />);
    mockMapEvents.dragstart();
    expect(onUserDrag).toHaveBeenCalledTimes(1);
  });
});
