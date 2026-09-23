import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteSearchPanel } from './RouteSearchPanel.jsx';

describe('RouteSearchPanel', () => {
  it('renders empty route point state', () => {
    render(<RouteSearchPanel />);

    expect(screen.getByRole('button', { name: 'Origin' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Destination' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Origin')).toBeEnabled();
    expect(screen.getByLabelText('Destination')).toBeEnabled();
    expect(screen.getAllByText('Not selected')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Use GPS' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Route calculation comes later' })).toBeDisabled();
  });

  it('calls selection and reset handlers', async () => {
    const user = userEvent.setup();
    const onClearPoint = jest.fn();
    const onRequestCurrentLocation = jest.fn();
    const onResetPoints = jest.fn();
    const onSetActivePoint = jest.fn();

    render(
      <RouteSearchPanel
        destination={{ lat: 41.66, lng: -0.88, source: 'map' }}
        onClearPoint={onClearPoint}
        onRequestCurrentLocation={onRequestCurrentLocation}
        onResetPoints={onResetPoints}
        onSetActivePoint={onSetActivePoint}
        origin={{ lat: 41.65, lng: -0.89, source: 'map' }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Destination' }));
    await user.click(screen.getAllByRole('button', { name: 'Use GPS' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Use GPS' })[1]);
    await user.type(screen.getByLabelText('Origin'), 'Plaza del Pilar');
    await user.click(screen.getAllByRole('button', { name: 'Clear' })[0]);
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onSetActivePoint).toHaveBeenCalledWith('destination');
    expect(onSetActivePoint).toHaveBeenCalledWith('origin');
    expect(onRequestCurrentLocation).toHaveBeenCalledWith('origin');
    expect(onRequestCurrentLocation).toHaveBeenCalledWith('destination');
    expect(onClearPoint).toHaveBeenCalledWith('origin');
    expect(onResetPoints).toHaveBeenCalledTimes(1);
  });

  it('shows geolocation states', () => {
    const { rerender } = render(
      <RouteSearchPanel geolocation={{ status: 'loading', errorMessage: '' }} />
    );

    expect(screen.getAllByRole('button', { name: 'Use GPS' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Use GPS' })[1]).toBeDisabled();

    rerender(
      <RouteSearchPanel
        geolocation={{ status: 'denied', errorMessage: 'Location permission was denied.' }}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Location permission was denied.');

    rerender(
      <RouteSearchPanel geolocation={{ status: 'success', errorMessage: '', pointType: 'destination' }} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Current location set as destination.');
  });
});
