import { useState } from 'react';

import { ProfileDialog } from '../route-profiles/ProfileDialog.jsx';

// PBI-12: button under the points that opens the favourite trips and the recent searches. Choosing
// one sets its origin and destination and calculates the route again, with the current weather.

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

// The first part of the place name ("Plaza del Pilar, Zaragoza, Spain" → "Plaza del Pilar").
const placeName = (point) =>
  point.label?.split(',')[0].trim() || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
export const tripText = (trip) => `${placeName(trip.origin)} → ${placeName(trip.destination)}`;

const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
function whenText(isoDate, now = new Date()) {
  const date = new Date(isoDate);
  return date.toDateString() === now.toDateString()
    ? `Hoy, ${timeFormat.format(date)}`
    : dayFormat.format(date);
}

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

function RouteHistoryDialog({ history, onSelectTrip, onClose }) {
  const [namingId, setNamingId] = useState(null);
  const [confirmsClear, setConfirmsClear] = useState(false);
  const [error, setError] = useState('');
  const { searches, favorites, status } = history;

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
    <ProfileDialog title="Recientes y favoritos" onClose={onClose}>
      {status === 'loading' && (
        <p className="profile-dialog-text" role="status">
          Cargando…
        </p>
      )}
      {status === 'error' && (
        <p className="history-error" role="alert">
          No se han podido cargar tus recientes y favoritos. Inténtalo más tarde.
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
          Favoritos
        </h3>
        {favorites.length ? (
          <ul className="history-list">
            {favorites.map((favorite) => (
              <li key={favorite.id}>
                <button type="button" className="history-trip" onClick={() => choose(favorite)}>
                  <strong>{favorite.name}</strong>
                  <small>{tripText(favorite)}</small>
                </button>
                <button
                  type="button"
                  className="history-action"
                  aria-label={`Quitar «${favorite.name}» de favoritos`}
                  onClick={() => run(() => history.removeFavorite(favorite.id))}
                >
                  <Icon kind="trash" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-dialog-text">
            Aún no tienes favoritos. Pulsa la estrella de un trayecto reciente para guardarlo.
          </p>
        )}
      </section>

      <section className="history-section" aria-labelledby="history-recent-title">
        <h3 id="history-recent-title">
          <Icon kind="clock" />
          Recientes
        </h3>
        {searches.length ? (
          <ul className="history-list">
            {searches.map((search) => {
              const isFavorite = history.isFavorite(search);
              return (
                <li key={search.id}>
                  <button type="button" className="history-trip" onClick={() => choose(search)}>
                    <strong>{tripText(search)}</strong>
                    <small>{whenText(search.searchedAt)}</small>
                  </button>
                  <button
                    type="button"
                    className={`history-action ${isFavorite ? 'is-favorite' : ''}`}
                    aria-label={
                      isFavorite
                        ? `${tripText(search)} ya está en favoritos`
                        : `Guardar ${tripText(search)} en favoritos`
                    }
                    aria-expanded={isFavorite ? undefined : namingId === search.id}
                    disabled={isFavorite}
                    onClick={() => setNamingId(namingId === search.id ? null : search.id)}
                  >
                    <Icon kind={isFavorite ? 'star-filled' : 'star'} />
                  </button>
                  {namingId === search.id && (
                    <FavoriteForm
                      trip={search}
                      onCancel={() => setNamingId(null)}
                      onSave={async (trip, name) => {
                        await history.addFavorite(trip, name);
                        setNamingId(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="profile-dialog-text">Aquí aparecerán tus últimas búsquedas de rutas.</p>
        )}
      </section>

      {searches.length > 0 &&
        (confirmsClear ? (
          <div className="history-confirm" role="group" aria-label="Confirmar borrado">
            <p className="profile-dialog-text">
              ¿Borrar tus {searches.length} búsquedas recientes? Los favoritos se mantienen.
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
                    await history.clearHistory();
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
            Borrar historial
          </button>
        ))}

      <div className="profile-dialog-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </ProfileDialog>
  );
}

export function RouteHistory({ history, onSelectTrip }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="history-button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        <Icon kind="clock" />
        Recientes y favoritos
      </button>
      {isOpen && (
        <RouteHistoryDialog
          history={history}
          onSelectTrip={onSelectTrip}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
