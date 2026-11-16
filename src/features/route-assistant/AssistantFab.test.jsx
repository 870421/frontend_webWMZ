import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AssistantFab } from './AssistantFab.jsx';

function Draft({ message, onMessageChange }) {
  return (
    <label>
      Pide un ajuste de la ruta
      <input value={message} onChange={(event) => onMessageChange(event.target.value)} />
    </label>
  );
}

function renderFab(props = {}) {
  return render(<AssistantFab {...props}>{(draft) => <Draft {...draft} />}</AssistantFab>);
}

describe('AssistantFab', () => {
  it('is a labelled button that opens the assistant in a dialog with the focus in it', async () => {
    const user = userEvent.setup();
    renderFab();
    const fab = screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas' });
    expect(fab).toHaveAttribute('aria-haspopup', 'dialog');
    expect(fab).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(fab);

    const dialog = screen.getByRole('dialog', { name: 'Cierzo · Asistente de rutas' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByLabelText('Pide un ajuste de la ruta')).toHaveFocus();
    expect(fab).toHaveAttribute('aria-expanded', 'true');
  });

  it('is round with only the logo; its name is in the accessible name and the tooltip', () => {
    renderFab();
    const fab = screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas' });

    expect(fab.querySelector('svg.cierzo-logo')).toHaveAttribute('aria-hidden', 'true');
    // The only text is the tooltip, hidden from screen readers (the name is already in the label).
    const tooltip = fab.querySelector('.assistant-fab-tooltip');
    expect(tooltip).toHaveTextContent('Cierzo');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(fab).toHaveTextContent(/^Cierzo$/);
  });

  it('shows the logo and the name in the title of the pop-up', async () => {
    const user = userEvent.setup();
    renderFab();
    await user.click(screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas' }));

    const title = screen.getByRole('heading', { name: 'Cierzo · Asistente de rutas' });
    expect(title.querySelector('svg.cierzo-logo')).toBeInTheDocument();
  });

  it('closes with Escape, with "Cerrar" and with a tap outside, and gives the focus back', async () => {
    const user = userEvent.setup();
    renderFab();
    const fab = screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas' });

    await user.click(fab);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fab).toHaveFocus();

    await user.click(fab);
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fab).toHaveFocus();

    await user.click(fab);
    await user.pointer({
      keys: '[MouseLeft]',
      target: document.querySelector('.profile-dialog-backdrop'),
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the text being written when it is closed and opened again', async () => {
    const user = userEvent.setup();
    renderFab();
    const fab = screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas' });

    await user.click(fab);
    await user.type(screen.getByLabelText('Pide un ajuste de la ruta'), 'más sombra');
    await user.keyboard('{Escape}');
    await user.click(fab);

    expect(screen.getByLabelText('Pide un ajuste de la ruta')).toHaveValue('más sombra');
  });

  it('says when the route on screen is the one the assistant adjusted', () => {
    renderFab({ isAdjusted: true });
    expect(
      screen.getByRole('button', { name: 'Abrir Cierzo, el asistente de rutas (ruta ajustada)' })
    ).toHaveClass('is-adjusted');
  });
});
