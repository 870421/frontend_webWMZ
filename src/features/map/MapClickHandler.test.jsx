import { render } from '@testing-library/react';
import { useMapEvents } from 'react-leaflet';

import { MapClickHandler } from './MapClickHandler.jsx';

jest.mock('react-leaflet', () => ({
  useMapEvents: jest.fn(),
}));

describe('MapClickHandler', () => {
  it('passes clicked coordinates to the selection handler', () => {
    const onSelectPoint = jest.fn();

    useMapEvents.mockImplementation((handlers) => {
      handlers.click({ latlng: { lat: 41.65, lng: -0.89 } });
    });

    render(<MapClickHandler onSelectPoint={onSelectPoint} />);

    expect(onSelectPoint).toHaveBeenCalledWith({
      lat: 41.65,
      lng: -0.89,
      source: 'map',
    });
  });
});
