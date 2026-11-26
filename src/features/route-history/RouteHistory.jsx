import { useState } from 'react';

import { Dialog } from '../../components/ui/Dialog.jsx';
import { DEVICE_SOURCE } from '../route-search/useDeviceLocation.js';

// PBI-12: button under the points that opens the favourite trips. Choosing one sets its origin and
// destination and calculates the route again, with the current weather. Since #180 the recent places
// are offered in the origin and destination fields; here they can be cleared, and the current trip
// is saved as a favourite.

const FAVORITE_NAME_MAX_LENGTH = 60;

function Icon({ kind }) {
  return (
    <svg className={`history-icon history-icon-${kind}`} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'clock' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
      {(kind === 'star' || kind === 'star-filled') && (
        <path d="M12 3.8c.3 0 .6.2.7.5l2 4.1c.1.2.3.4.6.4l4.5.7c.7.1.9.9.4 1.4l-3.2 3.2c-.2.2-.3.4-.2.7l.8 4.5c.1.7-.6 1.2-1.2.9l-4-2.1a.8.8 0 0 0-.8 0l-4 2.1c-.6.3-1.3-.2-1.2-.9l.8-4.5c0-.3 0-.5-.2-.7L3.8 10.9c-.5-.5-.2-1.3.4-1.4l4.5-.7c.3 0 .5-.2.6-.4l2-4.1c.1-.3.4-.5.7-.5Z" />
      )}
      {kind === 'trash' && <path d="M5 7h14M9.5 7V5h5v2M7 7l1 12h8l1-12M10.5 10.5v5M13.5 10.5v5" />}
    </svg>
  );
}

export { Icon as HistoryIcon };

// The first part of the place name ("Plaza del Pilar, Zaragoza, Spain" → "Plaza del Pilar").
const placeName = (point) =>
  point.label?.split(',')[0].trim() || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
export const tripText = (trip) => `${placeName(trip.origin)} → ${placeName(trip.destination)}`;

function FavoriteForm({ trip, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await onSave(trip, name.trim());
    } catch (saveError) {
      setError(saveError.message);
      setIsSaving(false);
    }
  }

  return (
    <form className="history-favorite-form" onSubmit={submit}>
      <label>
        <span>Nombre del favorito (opcional)</span>
        <input
          value={name}
          maxLength={FAVORITE_NAME_MAX_LENGTH}
          placeholder={tripText(trip)}
          onChange={(event) => setName(event.target.value)}
          aria-describedby={error ? 'history-favorite-error' : undefined}
        />
      </label>
      {error && (
        <p id="history-favorite-error" className="history-error" role="alert">
          {error}
        </p>
      )}
      <div className="profile-dialog-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="profile-dialog-confirm" disabled={isSaving}>
          Guardar
        </button>
      </div>
    </form>
  );
}

// Saving the trip on screen: only with both points, and not with «Mi ubicación» (its coordinates
// are only valid now).
function SaveCurrentTrip({ trip, history }) {
  const [isNaming, setIsNaming] = useState(false);
  const [savedName, setSavedName] = useState('');

  if (savedName) {
    return (
      <p className="profile-dialog-text" role="status">
        Guardado en favoritos como «{savedName}».
      </p>
    );
  }
  if (!trip) {
    return (
      <p className="profile-dialog-text">
        Elige un origen y un destino para guardar el trayecto en favoritos.
      </p>
    );
  }
  if (trip.origin.source === DEVICE_SOURCE || trip.destination.source === DEVICE_SOURCE) {
    return (
      <p className="profile-dialog-text">
        Para guardar el trayecto en favoritos, elige un origen y un destino sin «Mi ubicación».
      </p>
    );
  }
  if (history.isFavorite(trip)) {
    return <p className="profile-dialog-text">{tripText(trip)} ya está en tus favoritos.</p>;
  }
  return isNaming ? (
    <FavoriteForm
      trip={trip}
      onCancel={() => setIsNaming(false)}
      onSave={async (current, name) => {
        const favorite = await history.addFavorite(current, name);
        setSavedName(favorite.name);
      }}
    />
  ) : (
    <button type="button" className="history-save-trip" onClick={() => setIsNaming(true)}>
      <Icon kind="star" />
      Guardar este trayecto
      <small>{tripText(trip)}</small>
    </button>
  );
}

export function FavoritesDialog({ history, currentTrip, onSelectTrip, onClose }) {
  const [confirmsClear, setConfirmsClear] = useState(false);
  const [error, setError] = useState('');
  const [removingFavoriteId, setRemovingFavoriteId] = useState(null);
  const { places, favorites, status } = history;

  function choose(trip) {
    onSelectTrip(trip);
    onClose();
  }

  async function run(action) {
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <Dialog title="Favoritos" onClose={onClose} className="favorites-dialog">
      {status === 'loading' && (
        <p className="profile-dialog-text" role="status">
          Cargando…
        </p>
      )}
      {status === 'error' && (
        <p className="history-error" role="alert">
          No se han podido cargar tus favoritos y lugares recientes. Inténtalo más tarde.
        </p>
      )}
      {error && (
        <p className="history-error" role="alert">
          {error}
        </p>
      )}

      <section className="history-section" aria-labelledby="history-favorites-title">
        <h3 id="history-favorites-title">
          <Icon kind="star-filled" />
          <span>Tus trayectos</span>
          {status === 'ready' && <span className="history-count">{favorites.length}</span>}
        </h3>
        {favorites.length ? (
          <ul className="history-list">
            {favorites.map((favorite) => (
              <li key={favorite.id}>
                <button
                  type="button"
                  className="history-trip"
                  onClick={() => choose(favorite)}
                  title={`Usar trayecto: ${tripText(favorite)}`}
                >
                  <strong>{favorite.name}</strong>
                  <span className="history-trip-route">
                    <span title={placeName(favorite.origin)}>{placeName(favorite.origin)}</span>
                    <span className="history-trip-arrow" aria-hidden="true">
                      →
                    </span>
                    <span title={placeName(favorite.destination)}>
                      {placeName(favorite.destination)}
                    </span>
                  </span>
                  <small className="history-trip-hint">Toca para calcular este trayecto</small>
                </button>
                <button
                  type="button"
                  className="history-action history-action-delete"
                  aria-label={
                    removingFavoriteId === favorite.id
                      ? `Quitando «${favorite.name}»`
                      : `Quitar «${favorite.name}» de favoritos`
                  }
                  title="Quitar de favoritos"
                  disabled={removingFavoriteId === favorite.id}
                  onClick={() =>
                    run(async () => {
                      setRemovingFavoriteId(favorite.id);
                      try {
                        await history.removeFavorite(favorite.id);
                      } finally {
                        setRemovingFavoriteId(null);
                      }
                    })
                  }
                >
                  <Icon kind="trash" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          status === 'ready' && (
            <div className="history-empty">
              <span className="history-empty-icon">
                <Icon kind="star" />
              </span>
              <p>
                <strong>Aún no tienes favoritos.</strong>
                <span>Guarda un trayecto y podrás repetirlo desde aquí.</span>
              </p>
            </div>
          )
        )}
        <SaveCurrentTrip trip={currentTrip} history={history} />
      </section>

      <section className="history-section" aria-labelledby="history-recent-title">
        <h3 id="history-recent-title">
          <Icon kind="clock" />
          Lugares recientes
        </h3>
        <p className="profile-dialog-text">
          {places.length
            ? `Tienes ${places.length === 1 ? '1 lugar reciente' : `${places.length} lugares recientes`}: aparecen al elegir el origen o el destino.`
            : 'Los lugares que uses como origen o destino aparecerán al elegirlos de nuevo.'}
        </p>
        {places.length > 0 &&
          (confirmsClear ? (
            <div className="history-confirm" role="group" aria-label="Confirmar borrado">
              <p className="profile-dialog-text">
                ¿Borrar tus lugares recientes? Los favoritos se mantienen.
              </p>
              <div className="profile-dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setConfirmsClear(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="profile-dialog-danger"
                  onClick={() =>
                    run(async () => {
                      await history.clearPlaces();
                      setConfirmsClear(false);
                    })
                  }
                >
                  Sí, borrar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="history-clear" onClick={() => setConfirmsClear(true)}>
              <Icon kind="trash" />
              Borrar lugares recientes
            </button>
          ))}
      </section>

      <div className="profile-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

export function RouteHistory({ history, currentTrip = null, onSelectTrip }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="history-button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        <Icon kind="star" />
        {/* Only the star on small screens (global.css); the name stays for screen readers. */}
        <span className="history-button-label">Favoritos</span>
      </button>
      {isOpen && (
        <FavoritesDialog
          history={history}
          currentTrip={currentTrip}
          onSelectTrip={onSelectTrip}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
