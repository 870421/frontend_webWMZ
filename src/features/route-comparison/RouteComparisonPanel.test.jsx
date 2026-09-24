import { render, screen } from '@testing-library/react';

import { RouteComparisonPanel } from './RouteComparisonPanel.jsx';

describe('RouteComparisonPanel', () => {
  it('renders the empty comparison state', () => {
    render(<RouteComparisonPanel />);

    expect(screen.getByRole('heading', { name: 'Comparison' })).toBeInTheDocument();
    expect(screen.getByText('Select an origin and destination to compare routes.')).toBeInTheDocument();
  });
});

