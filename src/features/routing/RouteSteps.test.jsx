import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getStreetNames, RouteSteps } from './RouteSteps.jsx';

const step = (instruction, name, distance, wayPoints) => ({
  instruction,
  name,
  distance,
  duration: 10,
  wayPoints,
});
const steps = [
  step(
    'Camina hacia el nordeste en Paseo de la Independencia',
    'Paseo de la Independencia',
    40,
    [0, 1]
  ),
  step('Gire a la derecha', null, 330, [1, 8]),
  step('Gire a la derecha a Calle de Alfonso I', 'Calle de Alfonso I', 135, [8, 12]),
  step('Siga todo recto a Plaza de Sas', 'Plaza de Sas', 21, [12, 14]),
  step('Siga todo recto a Calle de Alfonso I', 'Calle de Alfonso I', 1316, [14, 20]),
  step('Llegar a su destino', null, 0, [20, 20]),
];

describe('RouteSteps', () => {
  it('lists the streets in order without repeating or inventing any', () => {
    expect(getStreetNames(steps)).toEqual([
      'Paseo de la Independencia',
      'Calle de Alfonso I',
      'Plaza de Sas',
    ]);
  });

  it('renders nothing without steps', () => {
    const { container } = render(<RouteSteps steps={[]} isOpen={false} onToggle={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays closed until the user asks for the route', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<RouteSteps steps={steps} isOpen={false} onToggle={onToggle} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver recorrido' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the streets and the steps, and selects a step', async () => {
    const user = userEvent.setup();
    const onSelectStep = jest.fn();
    render(
      <RouteSteps
        steps={steps}
        isOpen
        onToggle={jest.fn()}
        selectedStepIndex={2}
        onSelectStep={onSelectStep}
      />
    );

    expect(
      screen.getByText('Pasas por Paseo de la Independencia, Calle de Alfonso I, Plaza de Sas.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /1,3 km/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Llegar a su destino' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /a Calle de Alfonso I 135 m/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: /Plaza de Sas/ }));
    expect(onSelectStep).toHaveBeenCalledWith(3);
  });

  it('does not write a summary of streets when no way has a name', () => {
    render(
      <RouteSteps
        steps={[step('Gire a la izquierda', null, 10, [0, 1])]}
        isOpen
        onToggle={jest.fn()}
      />
    );
    expect(screen.queryByText(/Pasas por/)).not.toBeInTheDocument();
  });
});
