import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteSearchPanel } from './RouteSearchPanel.jsx';
import { usePlaceAutocomplete } from './usePlaceAutocomplete.js';
import { useRoutePoints } from './useRoutePoints.js';

function StatefulPanel({ onSetPoint }) {
  const points = useRoutePoints();
  return <RouteSearchPanel {...points} onSetActivePoint={points.setActivePoint}
    onEditPoint={points.editPoint} onClearPoint={points.clearPoint} onResetPoints={points.resetPoints}
    onSetPoint={(...args) => { points.setPoint(...args); onSetPoint?.(...args); }} />;
}

jest.mock('./usePlaceAutocomplete.js', () => ({
  usePlaceAutocomplete: jest.fn(() => ({
    errorMessage: '',
    isLoading: false,
    results: []
  }))
}));

describe('RouteSearchPanel', () => {
  beforeEach(() => {
    usePlaceAutocomplete.mockReturnValue({
      errorMessage: '',
      isLoading: false,
      results: []
    });
  });

  it('renders empty route point state', () => {
    render(<RouteSearchPanel />);

    expect(screen.getByRole('button', { name: 'Origin' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Destination' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Origin')).toBeEnabled();
    expect(screen.getByLabelText('Destination')).toBeEnabled();
    expect(screen.getAllByText('Not selected')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Use GPS for origin' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Use GPS for destination' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Route calculation comes later' })).toBeDisabled();
  });

  it('selects an autocomplete result for the active input', async () => {
    const user = userEvent.setup();
    const onSetPoint = jest.fn();

    usePlaceAutocomplete.mockReturnValue({
      errorMessage: '',
      isLoading: false,
      results: [
        {
          id: 'place-1',
          label: 'Plaza del Pilar, Zaragoza, Spain',
          lat: 41.656,
          lng: -0.878
        }
      ]
    });

    render(<StatefulPanel onSetPoint={onSetPoint} />);

    await user.type(screen.getByLabelText('Origin'), 'Pilar');
    await user.click(screen.getByRole('option', { name: 'Plaza del Pilar, Zaragoza, Spain' }));

    expect(onSetPoint).toHaveBeenCalledWith('origin', {
      lat: 41.656,
      lng: -0.878,
      label: 'Plaza del Pilar, Zaragoza, Spain',
      source: 'search'
    });
    expect(screen.getByLabelText('Origin')).toHaveValue('Plaza del Pilar, Zaragoza, Spain');
    expect(screen.getByText('41.65600, -0.87800')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Use GPS for origin' }));
    await user.click(screen.getByRole('button', { name: 'Use GPS for destination' }));
    await user.type(screen.getByLabelText('Origin'), 'Plaza del Pilar');
    await user.click(screen.getByRole('button', { name: 'Clear origin' }));
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

    expect(screen.getByRole('button', { name: 'Use GPS for origin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use GPS for destination' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Getting current location...');

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

  it('clears draft text and invalidates selected coordinates when editing', async () => {
    const user = userEvent.setup();
    usePlaceAutocomplete.mockReturnValue({ errorMessage: '', isLoading: false,
      results: [{ id: '1', label: 'Pilar', lat: 41.656, lng: -0.878 }] });
    render(<StatefulPanel />);
    const origin = screen.getByLabelText('Origin');
    await user.type(origin, 'Pilar');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(origin).toHaveValue('Pilar');
    await user.type(origin, ' changed');
    expect(screen.getAllByText('Not selected')).toHaveLength(2);
    await user.type(screen.getByLabelText('Destination'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(origin).toHaveValue('');
    expect(screen.getByLabelText('Destination')).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(origin, 'draft');
    await user.click(screen.getByRole('button', { name: 'Clear origin' }));
    expect(origin).toHaveValue('');
  });

  it('supports keyboard selection, Escape, and blur dismissal', async () => {
    const user = userEvent.setup();
    usePlaceAutocomplete.mockReturnValue({ errorMessage: '', isLoading: false,
      results: [{ id: '1', label: 'Pilar', lat: 41.656, lng: -0.878 }] });
    render(<StatefulPanel />);
    const destination = screen.getByLabelText('Destination');
    await user.type(destination, 'Pilar');
    await user.keyboard('{ArrowUp}');
    expect(destination).toHaveAttribute('aria-activedescendant', 'destination-suggestions-0');
    await user.keyboard('{Escape}');
    expect(destination).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(destination).toHaveValue('Pilar');
    expect(screen.getByText('41.65600, -0.87800')).toBeInTheDocument();
    await user.type(destination, ' new');
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows loading, empty and error states for an edited input', async () => {
    const user = userEvent.setup();
    const view = render(<StatefulPanel />);
    await user.type(screen.getByLabelText('Origin'), 'Unknown');
    expect(screen.getByRole('status')).toHaveTextContent('No places found');
    usePlaceAutocomplete.mockReturnValue({ results: [], isLoading: true, errorMessage: '' });
    view.rerender(<StatefulPanel />);
    expect(screen.getByRole('status')).toHaveTextContent('Searching places');
    usePlaceAutocomplete.mockReturnValue({ results: [], isLoading: false, errorMessage: 'Search unavailable' });
    view.rerender(<StatefulPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('Search unavailable');
  });
});
