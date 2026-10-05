import { render, screen } from '@testing-library/react';

import { ComfortSummary } from './ComfortSummary.jsx';

describe('ComfortSummary', () => {
  it('renders the empty comfort state', () => {
    render(<ComfortSummary />);

    expect(screen.getByRole('heading', { name: 'Confort' })).toBeInTheDocument();
    expect(screen.getByText('Los datos de confort aparecerán después de calcular una ruta.')).toBeInTheDocument();
  });
});

