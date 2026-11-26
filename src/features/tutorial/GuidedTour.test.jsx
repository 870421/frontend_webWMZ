import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GuidedTour, TOUR_STEPS } from './GuidedTour.jsx';

describe('GuidedTour', () => {
  it('shows six accessible steps with navigation and skip actions', async () => {
    const user = userEvent.setup();
    const next = jest.fn();
    const previous = jest.fn();
    const skip = jest.fn();
    render(<GuidedTour step={0} onNext={next} onPrevious={previous} onSkip={skip} />);
    expect(TOUR_STEPS).toHaveLength(6);
    expect(screen.getByRole('dialog', { name: 'Origen y destino' })).toHaveAttribute(
      'aria-modal',
      'true'
    );
    expect(screen.getByText('Paso 1 de 6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(next).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Saltar tutorial' }));
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it('can skip with Escape', async () => {
    const user = userEvent.setup();
    const skip = jest.fn();
    render(<GuidedTour step={1} onNext={jest.fn()} onPrevious={jest.fn()} onSkip={skip} />);
    await user.keyboard('{Escape}');
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it('uses the current weather section as the final tutorial step', () => {
    render(<GuidedTour step={5} onNext={jest.fn()} onPrevious={jest.fn()} onSkip={jest.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Consulta el tiempo actual' })).toBeInTheDocument();
    expect(TOUR_STEPS[5].target).toBe('[data-tour="current-weather"]');
  });
});
