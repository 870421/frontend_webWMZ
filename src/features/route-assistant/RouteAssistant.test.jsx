import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteAssistant } from './RouteAssistant.jsx';

const NO_WEIGHTS = { shade: 0, sun: 0, wind: 0, vegetation: 0 };
const APPLIED = {
  assistant: {
    status: 'applied',
    explanation: 'Busco sombra y evito el viento, con hasta un 35 % más de tiempo.',
    before: { weights: { ...NO_WEIGHTS, sun: 30 }, maxDetourPercentage: 25 },
    after: { weights: { ...NO_WEIGHTS, shade: 50, wind: 40 }, maxDetourPercentage: 35 },
    changes: [],
  },
  comparison: { status: 'selected' },
};
const PROFILES = [
  { id: 1, name: 'Rápida', weights: NO_WEIGHTS, maxDetourPercentage: 25 },
  { id: 2, name: 'Sombreada', weights: { ...NO_WEIGHTS, shade: 50 }, maxDetourPercentage: 25 },
];

function renderAssistant(props = {}) {
  const handlers = {
    onAsk: jest.fn().mockResolvedValue(undefined),
    onSaveProfile: jest.fn(async (draft) => ({ id: 9, ...draft })),
    onReplaceProfile: jest.fn(async (id, draft) => ({ id, ...draft })),
  };
  const view = render(<RouteAssistant profiles={PROFILES} canSave {...handlers} {...props} />);
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

  it('shows the explanation and every weight that changed, before → after, with the editor scales', () => {
    renderAssistant({ status: 'done', result: APPLIED, applied: APPLIED.assistant });

    expect(screen.getByText(APPLIED.assistant.explanation)).toBeInTheDocument();
    const changes = within(screen.getByRole('list', { name: 'Pesos cambiados por Cierzo' }));
    const rows = changes.getAllByRole('listitem');
    expect(
      rows.map((row) => [
        row.querySelector('.assistant-change-name').textContent,
        row.querySelector('.assistant-change-value').textContent,
      ])
    ).toEqual([
      ['Sombra o sol', 'Sol 30 % → Sombra 50 %'],
      ['Evitar viento', '0 % → 40 %'],
      ['Tiempo extra máximo', '+25 % → +35 %'],
    ]);
    // One shade-sun bar from -100 (shade) to 100 (sun), as in the editor (ADR-030).
    const [shadeSunBefore, shadeSunAfter] = within(rows[0]).getAllByRole('meter', { hidden: true });
    expect(shadeSunBefore).toHaveAttribute('aria-valuenow', '30');
    expect(shadeSunAfter).toHaveAttribute('aria-valuenow', '-50');
    expect(shadeSunAfter).toHaveAttribute('aria-valuemin', '-100');
    expect(rows[1].querySelectorAll('meter')[1]).toHaveAttribute('value', '40');
    // The green did not change: it is not listed.
    expect(changes.queryByText('Verde')).not.toBeInTheDocument();
  });

  it.each([
    ['not_understood', 'No he entendido la petición.'],
    ['timeout', 'Cierzo ha tardado demasiado. Tu ruta no ha cambiado.'],
    ['not_configured', 'Cierzo no está disponible en este servidor.'],
  ])('a %s notice is shown and nothing can be saved', (status, message) => {
    renderAssistant({
      status: 'done',
      result: {
        assistant: { status, message, before: APPLIED.assistant.before, after: null, changes: [] },
        comparison: null,
      },
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar como ruta' })).not.toBeInTheDocument();
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

  describe('save as a route', () => {
    it('"Cancelar" goes back to the assistant with the focus on "Guardar como ruta"', async () => {
      const user = userEvent.setup();
      const { onSaveProfile } = renderAssistant({
        status: 'done',
        result: APPLIED,
        applied: APPLIED.assistant,
      });

      await user.click(screen.getByRole('button', { name: 'Guardar como ruta' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('region', { name: 'Guardar como ruta' })).not.toBeInTheDocument();
      expect(screen.getByText(APPLIED.assistant.explanation)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar como ruta' })).toHaveFocus();
      expect(onSaveProfile).not.toHaveBeenCalled();
    });

    it('opens the editor with the assistant weights and a free name', async () => {
      const user = userEvent.setup();
      const { onSaveProfile } = renderAssistant({
        status: 'done',
        result: APPLIED,
        applied: APPLIED.assistant,
        profiles: [...PROFILES, { id: 5, name: 'Ruta de Cierzo', weights: NO_WEIGHTS }],
      });

      await user.click(screen.getByRole('button', { name: 'Guardar como ruta' }));
      // The editor takes the place of the assistant, inside the same pop-up, with the focus.
      const editor = screen.getByRole('region', { name: 'Guardar como ruta' });
      const dialog = within(editor);
      expect(screen.queryByLabelText('Pide a Cierzo un ajuste de la ruta')).not.toBeInTheDocument();
      expect(dialog.getByLabelText('Nombre')).toHaveValue('Ruta de Cierzo (2)');
      expect(editor).toContainElement(document.activeElement);
      expect(dialog.getByLabelText('Sombra o sol')).toHaveValue('-50');
      expect(dialog.getByLabelText('Evitar viento')).toHaveValue('40');
      expect(dialog.getByLabelText('Tiempo extra máximo')).toHaveValue('35');

      await user.click(dialog.getByRole('button', { name: 'Guardar' }));

      expect(onSaveProfile).toHaveBeenCalledWith({
        name: 'Ruta de Cierzo (2)',
        weights: { shade: 50, sun: 0, wind: 40, vegetation: 0 },
        maxDetourPercentage: 35,
      });
      expect(screen.queryByRole('region', { name: 'Guardar como ruta' })).not.toBeInTheDocument();
      expect(
        screen.getByText('Guardada en tus rutas como «Ruta de Cierzo (2)».')
      ).toBeInTheDocument();
      // The focus goes back to the button it came from.
      expect(screen.getByRole('button', { name: 'Guardar como ruta' })).toHaveFocus();
    });

    it('warns about a repeated name and "Reemplazar" only changes that route, deleting none', async () => {
      const user = userEvent.setup();
      const { onSaveProfile, onReplaceProfile } = renderAssistant({
        status: 'done',
        result: APPLIED,
        applied: APPLIED.assistant,
      });

      await user.click(screen.getByRole('button', { name: 'Guardar como ruta' }));
      const dialog = within(screen.getByRole('region', { name: 'Guardar como ruta' }));
      await user.clear(dialog.getByLabelText('Nombre'));
      await user.type(dialog.getByLabelText('Nombre'), 'sombreada');
      expect(dialog.getByText('Ya tienes una ruta llamada «Sombreada».')).toBeInTheDocument();

      await user.click(dialog.getByRole('button', { name: 'Reemplazar' }));
      // Nothing else is deleted: the question only speaks of the weights of "Sombreada".
      expect(dialog.getByText('Se sustituirán los pesos de «Sombreada».')).toBeInTheDocument();
      expect(dialog.queryByText(/se borrará/)).not.toBeInTheDocument();
      await user.click(dialog.getByRole('button', { name: 'Reemplazar «Sombreada»' }));

      expect(onReplaceProfile).toHaveBeenCalledTimes(1);
      expect(onReplaceProfile).toHaveBeenCalledWith(2, {
        name: 'Sombreada',
        weights: { shade: 50, sun: 0, wind: 40, vegetation: 0 },
        maxDetourPercentage: 35,
      });
      expect(onSaveProfile).not.toHaveBeenCalled();
      expect(screen.getByText('Guardada en tus rutas como «Sombreada».')).toBeInTheDocument();
    });

    it('is not offered when the routes cannot be saved', () => {
      renderAssistant({
        status: 'done',
        result: APPLIED,
        applied: APPLIED.assistant,
        canSave: false,
      });
      expect(screen.queryByRole('button', { name: 'Guardar como ruta' })).not.toBeInTheDocument();
    });
  });
});
