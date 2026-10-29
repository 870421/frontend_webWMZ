import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteComparisonPanel } from './RouteComparisonPanel.jsx';

const route = (duration, shadePercentage) => ({
  duration,
  exposure: { status: 'available', shadePercentage, sunPercentage: 100 - shadePercentage },
});

describe('RouteComparisonPanel', () => {
  it('compares both routes and lets the user alternate between them', async () => {
    const user = userEvent.setup();
    const onSelectRoute = jest.fn();
    render(
      <RouteComparisonPanel
        comparison={{
          status: 'selected',
          fastest: route(900, 20),
          shaded: route(1020, 70),
          additionalDurationSeconds: 120,
          shadeImprovementPercentagePoints: 50,
        }}
        selectedRouteType="fastest"
        onSelectRoute={onSelectRoute}
      />
    );

    expect(screen.getByText('20 % de sombra')).toBeInTheDocument();
    expect(screen.getByText('70 % de sombra')).toBeInTheDocument();
    expect(screen.getByText(/añade 2 min/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Con sombra/ }));
    expect(onSelectRoute).toHaveBeenCalledWith('shaded');
  });

  it('shows the distance of each route next to its duration', () => {
    render(
      <RouteComparisonPanel
        comparison={{
          status: 'selected',
          fastest: { ...route(900, 20), distance: 1250 },
          shaded: { ...route(1020, 70), distance: 980 },
          additionalDurationSeconds: 120,
          shadeImprovementPercentagePoints: 50,
        }}
        selectedRouteType="shaded"
        onSelectRoute={jest.fn()}
      />
    );

    expect(screen.getByText('15 min · 1,3 km')).toBeInTheDocument();
    expect(screen.getByText('17 min · 980 m')).toBeInTheDocument();
  });

  it('explains when no real shaded alternative exists', () => {
    render(
      <RouteComparisonPanel
        comparison={{ status: 'no_better_alternative', fastest: route(900, 20), shaded: null }}
        selectedRouteType="fastest"
        onSelectRoute={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Con sombra/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('No se ha encontrado una alternativa');
  });

  it('explains when the sun is too low to estimate shade', () => {
    render(
      <RouteComparisonPanel
        comparison={{
          status: 'sun_too_low',
          fastest: { duration: 900, exposure: { status: 'unavailable' } },
          shaded: null,
        }}
        selectedRouteType="fastest"
        onSelectRoute={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Con sombra/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('El Sol está demasiado bajo');
  });
});
