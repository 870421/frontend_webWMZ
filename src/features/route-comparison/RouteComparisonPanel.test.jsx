import { render, screen } from '@testing-library/react';

import { RouteComparisonPanel } from './RouteComparisonPanel.jsx';

describe('RouteComparisonPanel', () => {
  it('renders the empty comparison state', () => {
    render(<RouteComparisonPanel />);

    expect(screen.getByRole('heading', { name: 'Comparación' })).toBeInTheDocument();
    expect(
      screen.getByText('Selecciona un origen y un destino para comparar rutas.')
    ).toBeInTheDocument();
  });
});
