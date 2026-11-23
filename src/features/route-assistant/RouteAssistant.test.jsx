import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteAssistant } from './RouteAssistant.jsx';

// The answers of the panel (PBI-18, ADR-036).
const NO_PREFERENCES = { sunShade: 'any', avoidWind: false, preferParks: false, extraMinutes: 5 };
const APPLIED = {
  assistant: {
    status: 'applied',
    explanation: 'He buscado sombra y evitaré el viento, aunque tardes un poco más.',
    before: { ...NO_PREFERENCES, sunShade: 'sun' },
    after: { ...NO_PREFERENCES, sunShade: 'shade', avoidWind: true, extraMinutes: 10 },
    changes: [],
  },
  comparison: { status: 'selected' },
};

function renderAssistant(props = {}) {
  const handlers = {
    onAsk: jest.fn().mockResolvedValue(undefined),
  };
  const view = render(<RouteAssistant {...handlers} {...props} />);
  return { ...view, ...handlers };
}

describe('RouteAssistant', () => {
  it('has a labelled field that sends the request with the button or Enter', async () => {
    const user = userEvent.setup();
    const { onAsk } = renderAssistant();

    const field = screen.getByLabelText('Pide a Cierzo un ajuste de la ruta');
    const button = screen.getByRole('button', { name: 'Ajustar' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/no escribas datos personales/)).toHaveTextContent('0/300');

    await user.type(field, '  evita el viento  ');
    expect(screen.getByText(/no escribas datos personales/)).toHaveTextContent('19/300');
    await user.click(button);
    expect(onAsk).toHaveBeenCalledWith('evita el viento');

    await user.type(field, '{Enter}');
    expect(onAsk).toHaveBeenCalledTimes(2);
  });

  it('limits the request to 300 characters', () => {
    renderAssistant();
    expect(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta')).toHaveAttribute(
      'maxLength',
      '300'
    );
  });

  it('while it works the button says so and cannot be pressed again', async () => {
    const user = userEvent.setup();
    const { rerender, onAsk } = renderAssistant();
    await user.type(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta'), 'sombra');

    rerender(<RouteAssistant status="loading" onAsk={onAsk} />);

    expect(screen.getByRole('button', { name: 'Ajustando...' })).toBeDisabled();
    expect(screen.getByText('Cierzo está ajustando tu ruta...')).toBeInTheDocument();
  });

  it('shows the explanation and every answer that changed, before → after, in words', () => {
    renderAssistant({ status: 'done', result: APPLIED, applied: APPLIED.assistant });

    expect(screen.getByText(APPLIED.assistant.explanation)).toBeInTheDocument();
    const changes = within(screen.getByRole('list', { name: 'Cambios de Cierzo' }));
    const rows = changes.getAllByRole('listitem');
    expect(
      rows.map((row) => [
        row.querySelector('.assistant-change-name').textContent,
        row.querySelector('.assistant-change-value').textContent,
      ])
    ).toEqual([
      ['Sombra o sol', 'Sol → Sombra'],
      ['Evitar el viento', 'No → Sí'],
      ['Tiempo extra', '+5 min → +10 min'],
    ]);
    // No weights or percentages (PBI-18): neither scales nor meters.
    expect(screen.queryByRole('meter', { hidden: true })).not.toBeInTheDocument();
    expect(
      changes
        .getAllByRole('listitem')
        .map((row) => row.textContent)
        .join(' ')
    ).not.toMatch(/%/);
    // Parks did not change: they are not listed.
    expect(changes.queryByText('Por parques')).not.toBeInTheDocument();
  });

  it.each([
    ['not_understood', 'No he entendido la petición.'],
    ['timeout', 'Cierzo ha tardado demasiado. Tu ruta no ha cambiado.'],
    ['not_configured', 'Cierzo no está disponible en este servidor.'],
  ])('a %s notice is shown and nothing can be used as preferences', (status, message) => {
    renderAssistant({
      status: 'done',
      result: {
        assistant: { status, message, before: APPLIED.assistant.before, after: null, changes: [] },
        comparison: null,
      },
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Usar como mis preferencias' })
    ).not.toBeInTheDocument();
  });

  it('shows an error without losing what the user wrote', async () => {
    const user = userEvent.setup();
    const { rerender, onAsk } = renderAssistant();
    await user.type(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta'), 'sombra');

    rerender(
      <RouteAssistant
        status="error"
        errorMessage="Has hecho muchas peticiones seguidas a Cierzo. Espera un minuto."
        onAsk={onAsk}
      />
    );

    expect(screen.getByText(/Espera un minuto/)).toBeInTheDocument();
    expect(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta')).toHaveValue('sombra');
  });

  it('can take the text being written from outside', async () => {
    const user = userEvent.setup();
    const onMessageChange = jest.fn();
    const { onAsk } = renderAssistant({ message: 'sombra', onMessageChange });

    expect(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta')).toHaveValue('sombra');
    await user.type(screen.getByLabelText('Pide a Cierzo un ajuste de la ruta'), 'x');
    expect(onMessageChange).toHaveBeenLastCalledWith('sombrax');
    await user.click(screen.getByRole('button', { name: 'Ajustar' }));
    expect(onAsk).toHaveBeenCalledWith('sombra');
  });
});
