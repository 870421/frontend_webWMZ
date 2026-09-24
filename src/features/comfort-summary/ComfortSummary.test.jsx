import { render, screen } from '@testing-library/react';

import { ComfortSummary } from './ComfortSummary.jsx';

describe('ComfortSummary', () => {
  it('renders the empty comfort state', () => {
    render(<ComfortSummary />);

    expect(screen.getByRole('heading', { name: 'Comfort' })).toBeInTheDocument();
    expect(screen.getByText('Comfort data will appear after a route is calculated.')).toBeInTheDocument();
  });
});

