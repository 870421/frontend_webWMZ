import { useState } from 'react';

import { Icon } from '../../components/ui/Icon.jsx';
import { InfoButton } from '../../components/ui/InfoButton.jsx';
import {
  MINUTE_CHOICES,
  SUN_SHADE_CHOICES,
  hasPreference,
  minutesText,
  preferencesSummary,
} from './preferenceTexts.js';

const WEATHER_LABEL = 'Según el tiempo de hoy';

/**
 * "¿Cómo prefieres ir?" (PBI-18, ADR-036): shade or sun, avoid the wind, go through parks and how
 * many minutes more the user would walk, as in the sketches of the team (Mejoras_S4). Native radio
 * buttons and checkboxes, so they work with a finger, a mouse and the keyboard. The minutes only
 * appear when some preference is chosen: with every answer indifferent the route is the fastest one.
 *
 * «Según el tiempo de hoy» (PBI-21, ADR-037): the weather marks the answers it chooses, which are
 * shown checked, and the reason goes under the button. Choosing shade, sun or the wind by hand
 * leaves it; parks and the minutes do not.
 *
 * Once a route is calculated the questions fold into a short summary with "Cambiar preferencias".
 */
export function RoutePreferences({
  preferences,
  byWeather = false,
  weather = { status: 'idle', message: '' },
  isCompact = false,
  showExtraTimeForTour = false,
  loadFailed = false,
  saveError = '',
  onChange,
  onToggleWeather,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const showsQuestions = !isCompact || isEditing;
  const asksMinutes = hasPreference(preferences);
  const summary = byWeather
    ? `${WEATHER_LABEL}: ${preferencesSummary(preferences)}`
    : preferencesSummary(preferences);

  function choose(changes) {
    setIsEditing(false);
    onChange(changes);
  }

  return (
    <section className="route-preferences" aria-labelledby="route-preferences-title">
      <div className="route-preferences-header">
        <div className="preferences-title-row">
          <h3 id="route-preferences-title">¿Cómo prefieres ir?</h3>
          <InfoButton label="preferencias">
            Elige sombra o sol, evitar el viento o pasar por parques; si lo dejas todo en «Me da
            igual», se calcula la ruta más rápida. «Según el tiempo de hoy» marca las opciones con
            el tiempo que hace y te dice por qué; puedes cambiarlas cuando quieras.
          </InfoButton>
        </div>
        <button
          type="button"
          className={`weather-choice ${byWeather ? 'is-active' : ''}`}
          aria-pressed={byWeather}
          data-tour="weather-today"
          onClick={() => {
            setIsEditing(false);
            onToggleWeather();
          }}
        >
          <Icon kind="weather" />
          {WEATHER_LABEL}
        </button>
      </div>

      {!showsQuestions ? (
        <div className="preferences-summary">
          <p>{summary}</p>
          <button
            type="button"
            className="secondary-button"
            aria-expanded="false"
            onClick={() => setIsEditing(true)}
          >
            Cambiar preferencias
          </button>
        </div>
      ) : (
        <>
          {byWeather && weather.message && (
            <p
              className={`preferences-note ${weather.status === 'loading' ? 'is-loading' : ''}`}
              role="status"
            >
              {weather.message}
            </p>
          )}
          <fieldset className="preference-group" aria-label="Sombra o sol">
            <legend>
              Sombra o sol{' '}
              <InfoButton label="sombra o sol">
                Indica si prefieres caminar por sombra o recibir más sol. «Me da igual» deja que se
                priorice la ruta rápida.
              </InfoButton>
            </legend>
            <div className="sun-shade-choices">
              {SUN_SHADE_CHOICES.map(({ value, label, icon }) => (
                <label key={value} className="preference-choice">
                  <input
                    type="radio"
                    name="sun-shade"
                    value={value}
                    checked={preferences.sunShade === value}
                    onChange={() => choose({ sunShade: value })}
                  />
                  <span>
                    {icon && <Icon kind={icon} />}
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="preference-group" aria-label="Viento y parques">
            <legend>
              Viento y parques{' '}
              <InfoButton label="viento y parques">
                <strong>Evitar el viento:</strong> busca calles más resguardadas y en las que el
                viento no sople de cara, sobre todo cuando hay cierzo. <strong>Por parques:</strong>{' '}
                prefiere recorridos que pasan junto a árboles, parques y zonas verdes. Solo cambian
                la ruta si hay un camino mejor dentro de los minutos extra que elijas.
              </InfoButton>
            </legend>
            <div className="toggle-choices">
              <label className="preference-toggle">
                <input
                  type="checkbox"
                  checked={preferences.avoidWind}
                  onChange={(event) => choose({ avoidWind: event.target.checked })}
                />
                <span>
                  <Icon kind="wind" />
                  Evitar el viento
                </span>
              </label>
              <label className="preference-toggle">
                <input
                  type="checkbox"
                  checked={preferences.preferParks}
                  onChange={(event) => choose({ preferParks: event.target.checked })}
                />
                <span>
                  <Icon kind="vegetation" />
                  Por parques
                </span>
              </label>
            </div>
          </fieldset>
          {asksMinutes && (
            <fieldset
              className="preference-group preference-minutes"
              data-tour="extra-time"
              aria-label="¿Cuánto más estás dispuesto a andar?"
            >
              <legend>
                <span>¿Cuánto más estás dispuesto a andar?</span>
                <InfoButton label="tiempo adicional">
                  El límite restringe cuánto más puede durar tu ruta preferida frente a la rápida.
                </InfoButton>
                <span className="preference-minutes-value" aria-hidden="true">
                  {preferences.extraMinutes === 0 ? 'Nada' : `+${preferences.extraMinutes} min`}
                </span>
              </legend>
              <div className="minute-choices">
                {MINUTE_CHOICES.map((minutes) => (
                  <label key={minutes} className="preference-choice">
                    <input
                      type="radio"
                      name="extra-minutes"
                      value={minutes}
                      checked={preferences.extraMinutes === minutes}
                      onChange={() => choose({ extraMinutes: minutes })}
                    />
                    <span>
                      {minutesText(minutes)}
                      {minutes > 0 && <span className="visually-hidden"> minutos</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {!asksMinutes && showExtraTimeForTour && (
            <fieldset
              className="preference-group preference-minutes tour-minutes-preview"
              data-tour="extra-time"
              aria-label="¿Cuánto más estás dispuesto a andar?"
            >
              <legend>¿Cuánto más estás dispuesto a andar?</legend>
              <p>Este ajuste aparecerá cuando elijas alguna preferencia.</p>
              <div className="minute-choices" aria-hidden="true">
                {MINUTE_CHOICES.map((minutes) => (
                  <span className="tour-minute-choice" key={minutes}>
                    {minutesText(minutes)}
                  </span>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
      {loadFailed && (
        <p className="form-message" role="status">
          No se han podido cargar tus preferencias: se usan las de por defecto y no se guardarán.
        </p>
      )}
      {saveError && (
        <p className="form-message form-message-error" role="alert">
          {saveError} Se usarán en esta ruta.
        </p>
      )}
    </section>
  );
}
