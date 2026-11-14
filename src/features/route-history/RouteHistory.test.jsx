import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteHistory, tripText } from './RouteHistory.jsx';

const point = (lat, label) => ({ lat, lng: -0.88, label });
const recent = {
  id: 1,
  origin: point(41.6572, 'Plaza del Pilar, Zaragoza, Spain'),
  destination: point(41.65, null),
  searchedAt: new Date().toISOString(),
};
const favorite = {
  id: 7,
  name: 'Casa',
  origin: point(41.66, 'Calle Mayor, Zaragoza'),
  destination: point(41.64, 'Plaza España, Zaragoza'),
  createdAt: '2026-11-10T10:00:00.000Z',
};

function history(overrides = {}) {
  return {
    status: 'ready',
    searches: [recent],
    favorites: [favorite],
    isFavorite: () => false,
    addFavorite: jest.fn().mockResolvedValue(),
    removeFavorite: jest.fn().mockResolvedValue(),
    clearHistory: jest.fn().mockResolvedValue(),
    ...overrides,
  };
}

async function open(props) {
  const user = userEvent.setup();
  render(<RouteHistory onSelectTrip={jest.fn()} {...props} />);
  await user.click(screen.getByRole('button', { name: 'Recientes y favoritos' }));
  return { user, dialog: screen.getByRole('dialog', { name: 'Recientes y favoritos' }) };
}

describe('RouteHistory', () => {
  it('names a trip with the first part of each place, or its coordinates', () => {
    expect(tripText(recent)).toBe('Plaza del Pilar → 41.6500, -0.8800');
  });

  it('shows the favourites and the recent searches, and repeats the chosen trip', async () => {
    const onSelectTrip = jest.fn();
    const { user, dialog } = await open({ history: history(), onSelectTrip });

    expect(within(dialog).getByRole('button', { name: /^Casa/ })).toHaveTextContent(
      'Calle Mayor → Plaza España'
    );
    expect(within(dialog).getByRole('button', { name: /^Plaza del Pilar →/ })).toHaveTextContent(
      /Hoy, \d{2}:\d{2}/
    );

    await user.click(within(dialog).getByRole('button', { name: /^Casa/ }));
    expect(onSelectTrip).toHaveBeenCalledWith(favorite);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves a recent trip as a favourite with an optional name', async () => {
    const data = history();
    const { user, dialog } = await open({ history: data });

    await user.click(within(dialog).getByRole('button', { name: /Guardar .* en favoritos/ }));
    await user.type(within(dialog).getByLabelText(/Nombre del favorito/), ' Facultad ');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(data.addFavorite).toHaveBeenCalledWith(recent, 'Facultad');
    expect(within(dialog).queryByLabelText(/Nombre del favorito/)).not.toBeInTheDocument();
  });

  it('shows why a favourite could not be saved', async () => {
    const data = history({
      addFavorite: jest.fn().mockRejectedValue(new Error('Ya está en tus favoritos.')),
    });
    const { user, dialog } = await open({ history: data });

    await user.click(within(dialog).getByRole('button', { name: /Guardar .* en favoritos/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya está en tus favoritos.');
  });

  it('marks a recent trip that is already a favourite and removes a favourite', async () => {
    const data = history({ isFavorite: () => true });
    const { user, dialog } = await open({ history: data });

    expect(within(dialog).getByRole('button', { name: /ya está en favoritos/ })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Quitar «Casa» de favoritos' }));
    expect(data.removeFavorite).toHaveBeenCalledWith(7);
  });

  it('clears the history only after confirming it, keeping the favourites', async () => {
    const data = history();
    const { user, dialog } = await open({ history: data });

    await user.click(within(dialog).getByRole('button', { name: 'Borrar historial' }));
    expect(within(dialog).getByText(/Los favoritos se mantienen/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(data.clearHistory).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Borrar historial' }));
    await user.click(within(dialog).getByRole('button', { name: 'Sí, borrar' }));
    expect(data.clearHistory).toHaveBeenCalled();
  });

  it('explains empty lists and a failed load', async () => {
    const { dialog } = await open({
      history: history({ status: 'error', searches: [], favorites: [] }),
    });

    expect(within(dialog).getByRole('alert')).toHaveTextContent('No se han podido cargar');
    expect(within(dialog).getByText(/Aún no tienes favoritos/)).toBeVisible();
    expect(within(dialog).getByText(/últimas búsquedas/)).toBeVisible();
    expect(
      within(dialog).queryByRole('button', { name: 'Borrar historial' })
    ).not.toBeInTheDocument();
  });
});
