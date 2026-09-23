import { render, screen } from '@testing-library/react';

import { App } from './App.jsx';

jest.mock('../features/map/MapView.jsx', () => ({
  MapView: () => <div data-testid="map-view" />
}));

describe('App', () => {
  it('renders the base application shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'WeatherMapZ' })).toBeInTheDocument();
    expect(screen.getByLabelText('Route controls')).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });
});

