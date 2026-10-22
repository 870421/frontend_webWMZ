import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useAuth } from './AuthProvider.jsx';
import { getInitials, UserMenu } from './UserMenu.jsx';

jest.mock('./AuthProvider.jsx', () => ({ useAuth: jest.fn() }));

describe('UserMenu', () => {
  let logout;

  beforeEach(() => {
    logout = jest.fn();
    useAuth.mockReturnValue({
      user: { id: 7, name: 'Ana López', email: 'ana@correo.es' },
      logout,
    });
  });

  function renderMenu() {
    render(
      <div>
        <UserMenu />
        <p>Fuera del menú</p>
      </div>
    );
    return screen.getByRole('button', { name: 'Menú de usuario de Ana López' });
  }

  it('shows the initials and keeps the menu closed until it is opened', () => {
    const button = renderMenu();

    expect(button).toHaveTextContent('AL');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with the user data, focuses the first option and logs out', async () => {
    const button = renderMenu();

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Opciones de usuario' })).toHaveAttribute(
      'id',
      button.getAttribute('aria-controls')
    );
    expect(screen.getByText('ana@correo.es')).toBeInTheDocument();
    const logoutItem = screen.getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(logoutItem).toHaveFocus();

    await userEvent.click(logoutItem);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('works with the keyboard and returns the focus when closed with Escape', async () => {
    const button = renderMenu();
    button.focus();

    await userEvent.keyboard('{Enter}');
    const logoutItem = screen.getByRole('menuitem', { name: 'Cerrar sesión' });
    expect(logoutItem).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(logoutItem).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(logoutItem).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes when tabbing out, clicking outside or clicking the button again', async () => {
    const button = renderMenu();

    await userEvent.click(button);
    await userEvent.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(button);
    await userEvent.click(screen.getByText('Fuera del menú'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(button);
    await userEvent.click(screen.getByText('Ana López'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it.each([
    ['Ana López', 'AL'],
    ['Victor Martinez Paramo', 'VM'],
    ['paramovic 2508', 'P'],
    ['  élise   ', 'É'],
    ['2508', '?'],
    [undefined, '?'],
  ])('builds the initials of %p', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
