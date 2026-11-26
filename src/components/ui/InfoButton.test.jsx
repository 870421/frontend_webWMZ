import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { InfoButton } from './InfoButton.jsx';

describe('InfoButton', () => {
  it('opens help, dismisses it outside or with Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InfoButton label="preferencias">Elige sombra o sol.</InfoButton>
        <button>Fuera</button>
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Ayuda: preferencias' });
    await user.click(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Elige sombra o sol.');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
