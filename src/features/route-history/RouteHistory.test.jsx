import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteHistory, tripText } from './RouteHistory.jsx';

const point = (lat, label, source = 'search') => ({ lat, lng: -0.88, label, source });
const trip = {
  origin: point(41.6572, 'Plaza del Pilar, Zaragoza, Spain'),
  destination: point(41.6488, 'Plaza de los Sitios, Zaragoza'),
};
const favorite = { id: 7, name: 'Casa', ...trip, createdAt: '2026-11-10T10:00:00.000Z' };

function makeHistory(overrides = {}) {
  return {
    places: [{ id: 1, lat: 41.65, lng: -0.88, label: 'Plaza', usedAt: '2026-11-16' }],
    favorites: [favorite],
    status: 'ready',
    addFavorite: jest.fn(async (_trip, name) => ({ id: 8, name: name || tripText(_trip) })),
    removeFavorite: jest.fn().mockResolvedValue(),
    clearPlaces: jest.fn().mockResolvedValue(),
    isFavorite: jest.fn(() => false),
    ...overrides,
  };
}

async function open(user, props) {
  render(<RouteHistory onSelectTrip={jest.fn()} {...props} />);
  await user.click(screen.getByRole('button', { name: 'Favoritos' }));
  return within(screen.getByRole('dialog', { name: 'Favoritos' }));
}

describe('RouteHistory', () => {
  it('chooses a favourite trip and closes', async () => {
    const user = userEvent.setup();
    const onSelectTrip = jest.fn();
    const dialog = await open(user, { history: makeHistory(), onSelectTrip });

    await user.click(dialog.getByRole('button', { name: /^Casa/ }));

    expect(onSelectTrip).toHaveBeenCalledWith(favorite);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('removes a favourite and shows the error if it fails', async () => {
    const user = userEvent.setup();
    const history = makeHistory({
      removeFavorite: jest.fn().mockRejectedValueOnce(new Error('No se ha podido quitar')),
    });
    const dialog = await open(user, { history });

    await user.click(dialog.getByRole('button', { name: 'Quitar «Casa» de favoritos' }));

    expect(history.removeFavorite).toHaveBeenCalledWith(7);
    expect(dialog.getByRole('alert')).toHaveTextContent('No se ha podido quitar');
  });

  it('saves the trip on screen with an optional name', async () => {
    const user = userEvent.setup();
    const history = makeHistory({ favorites: [] });
    const dialog = await open(user, { history, currentTrip: trip });
    expect(dialog.getByText('Aún no tienes favoritos.')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: /Guardar este trayecto/ }));
    const name = dialog.getByLabelText('Nombre del favorito (opcional)');
    expect(name).toHaveAttribute('placeholder', 'Plaza del Pilar → Plaza de los Sitios');
    await user.type(name, ' Paseo ');
    await user.click(dialog.getByRole('button', { name: 'Guardar' }));

    expect(history.addFavorite).toHaveBeenCalledWith(trip, 'Paseo');
    expect(dialog.getByRole('status')).toHaveTextContent('Guardado en favoritos como «Paseo».');
  });

  it('keeps the form and shows why when saving fails, and can cancel', async () => {
    const user = userEvent.setup();
    const history = makeHistory({
      addFavorite: jest.fn().mockRejectedValue(new Error('Ese trayecto ya está en tus favoritos')),
    });
    const dialog = await open(user, { history, currentTrip: trip });

    await user.click(dialog.getByRole('button', { name: /Guardar este trayecto/ }));
    await user.click(dialog.getByRole('button', { name: 'Guardar' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('ya está en tus favoritos');

    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(dialog.getByRole('button', { name: /Guardar este trayecto/ })).toBeInTheDocument();
  });

  it('explains when the trip on screen cannot be saved', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RouteHistory history={makeHistory()} currentTrip={null} onSelectTrip={jest.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Favoritos' }));
    expect(screen.getByText(/Elige un origen y un destino para guardar/)).toBeInTheDocument();
    unmount();

    const withDevice = { ...trip, origin: point(41.66, 'Mi ubicación', 'device') };
    let dialog = await open(user, { history: makeHistory(), currentTrip: withDevice });
    expect(dialog.getByText(/sin «Mi ubicación»/)).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: /Guardar este trayecto/ })).not.toBeInTheDocument();
    cleanup();

    dialog = await open(user, {
      history: makeHistory({ isFavorite: () => true }),
      currentTrip: trip,
    });
    expect(
      dialog.getByText('Plaza del Pilar → Plaza de los Sitios ya está en tus favoritos.')
    ).toBeInTheDocument();
  });

  it('clears the recent places after confirming; the favourites stay', async () => {
    const user = userEvent.setup();
    const history = makeHistory();
    const dialog = await open(user, { history });
    expect(dialog.getByText(/Tienes 1 lugar reciente/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Borrar lugares recientes' }));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(history.clearPlaces).not.toHaveBeenCalled();

    await user.click(dialog.getByRole('button', { name: 'Borrar lugares recientes' }));
    expect(dialog.getByRole('group', { name: 'Confirmar borrado' })).toHaveTextContent(
      'Los favoritos se mantienen'
    );
    await user.click(dialog.getByRole('button', { name: 'Sí, borrar' }));
    expect(history.clearPlaces).toHaveBeenCalledTimes(1);
  });

  it('counts several recent places and says when there are none', async () => {
    const user = userEvent.setup();
    const places = [1, 2, 3].map((id) => ({ id, lat: 41.6, lng: -0.88, label: 'X', usedAt: '' }));
    const { unmount } = render(
      <RouteHistory history={makeHistory({ places })} onSelectTrip={jest.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Favoritos' }));
    expect(screen.getByText(/Tienes 3 lugares recientes/)).toBeInTheDocument();
    unmount();

    const dialog = await open(user, { history: makeHistory({ places: [] }) });
    expect(dialog.getByText(/aparecerán al elegirlos de nuevo/)).toBeInTheDocument();
    expect(
      dialog.queryByRole('button', { name: 'Borrar lugares recientes' })
    ).not.toBeInTheDocument();
  });

  it('says when it is loading or the lists could not be loaded', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RouteHistory
        history={makeHistory({ status: 'loading', favorites: [], places: [] })}
        onSelectTrip={jest.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Favoritos' }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    unmount();

    const dialog = await open(user, { history: makeHistory({ status: 'error' }) });
    expect(dialog.getByRole('alert')).toHaveTextContent('No se han podido cargar');
  });

  it('names a trip after the first part of each place, or its coordinates', () => {
    expect(tripText(trip)).toBe('Plaza del Pilar → Plaza de los Sitios');
    expect(
      tripText({ origin: { lat: 41.65, lng: -0.88, label: null }, destination: trip.origin })
    ).toBe('41.6500, -0.8800 → Plaza del Pilar');
  });
});
