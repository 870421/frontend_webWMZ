import { render } from '@testing-library/react';
import { useMap } from 'react-leaflet';

import { MapFocusHandler } from './MapFocusHandler.jsx';

jest.mock('react-leaflet', () => ({
  useMap: jest.fn()
}));

describe('MapFocusHandler', () => {
  it('recenters the map when a point is selected', () => {
    const flyTo = jest.fn();

    useMap.mockReturnValue({
      flyTo,
      getZoom: () => 13
    });

    render(<MapFocusHandler point={{ lat: 41.65, lng: -0.89 }} />);

    expect(flyTo).toHaveBeenCalledWith([41.65, -0.89], 15, {
      animate: true,
      duration: 0.7
    });
  });

  it('does nothing without a selected point', () => {
    const flyTo = jest.fn();

    useMap.mockReturnValue({
      flyTo,
      getZoom: () => 13
    });

    render(<MapFocusHandler point={null} />);

    expect(flyTo).not.toHaveBeenCalled();
  });
});
