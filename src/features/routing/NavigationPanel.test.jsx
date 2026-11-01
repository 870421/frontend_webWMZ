import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NavigationPanel } from './NavigationPanel.jsx';

const progress = {
  instruction: 'Gire a la derecha a Calle de Alfonso I',
  distanceToInstructionM: 80,
  remainingM: 1250,
  remainingSeconds: 900,
  isOffRoute: false,
  hasStarted: true,
  hasArrived: false,
};

describe('NavigationPanel', () => {
  it('waits for the first position', () => {
    render(<NavigationPanel progress={null} onStop={jest.fn()} />);

    expect(screen.getByText('Buscando tu ubicación…')).toBeInTheDocument();
    expect(screen.queryByText(/Quedan/)).not.toBeInTheDocument();
  });

  it('shows the next instruction, its distance and what remains', () => {
    render(<NavigationPanel progress={progress} onStop={jest.fn()} />);

    expect(screen.getByText('En 80 m')).toBeInTheDocument();
    expect(screen.getByText('Gire a la derecha a Calle de Alfonso I')).toBeInTheDocument();
    expect(screen.getByText('1,3 km')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('shows an instruction without distance at the start', () => {
    render(
      <NavigationPanel
        progress={{ ...progress, instruction: 'Camina', distanceToInstructionM: null }}
        onStop={jest.fn()}
      />
    );

    expect(screen.getByText('Camina')).toBeInTheDocument();
    expect(screen.queryByText(/^En /)).not.toBeInTheDocument();
  });

  it('warns when the user leaves the route', () => {
    render(<NavigationPanel progress={{ ...progress, isOffRoute: true }} onStop={jest.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Te has salido de la ruta');
    expect(screen.queryByText('En 80 m')).not.toBeInTheDocument();
    expect(screen.queryByText('Gire a la derecha a Calle de Alfonso I')).not.toBeInTheDocument();
  });

  it('guides the user to the route when they are not on it yet', () => {
    render(
      <NavigationPanel
        progress={{ ...progress, isOffRoute: true, hasStarted: false }}
        onStop={jest.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Todavía no estás en la ruta');
  });

  it('says so when the GPS signal is lost', () => {
    render(<NavigationPanel progress={progress} signalLost onStop={jest.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Se ha perdido la señal');
  });

  it('announces the arrival and can be ended', async () => {
    const user = userEvent.setup();
    const onStop = jest.fn();
    render(<NavigationPanel progress={{ ...progress, hasArrived: true }} onStop={onStop} />);

    expect(screen.getByText('Has llegado a tu destino')).toBeInTheDocument();
    expect(screen.queryByText(/Quedan/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminar' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('works on routes without steps', () => {
    render(
      <NavigationPanel
        progress={{ ...progress, instruction: null, distanceToInstructionM: null }}
        onStop={jest.fn()}
      />
    );

    expect(screen.getByText('Sigue la línea del mapa')).toBeInTheDocument();
  });
});
