import { useEffect, useState } from 'react';

import { formatPointLabel } from './useRoutePoints.js';

const noop = () => {};
const DEFAULT_GEOLOCATION = {
  status: 'idle',
  errorMessage: ''
};

function PointInput({
  activePoint,
  isLocating,
  name,
  onActivate,
  onChange,
  onClear,
  onUseLocation,
  point,
  title,
  value
}) {
  return (
    <div className="point-field">
      <label>
        {title}
        <input
          autoComplete="off"
          inputMode="search"
          name={name}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => {
            onActivate(name);
            event.target.select();
          }}
          placeholder={`Type ${title.toLowerCase()} or tap the map`}
          type="search"
          value={value}
        />
      </label>
      <p className="point-coordinate">{formatPointLabel(point)}</p>
      <div className="point-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isLocating}
          onClick={() => onUseLocation(name)}
        >
          Use GPS
        </button>
        <button type="button" className="secondary-button" disabled={!point} onClick={onClear}>
          Clear
        </button>
      </div>
      {activePoint === name ? <span className="active-point-note">Map tap target</span> : null}
    </div>
  );
}

export function RouteSearchPanel({
  activePoint = 'origin',
  destination = null,
  geolocation = DEFAULT_GEOLOCATION,
  onClearGeolocationMessage = noop,
  onClearPoint = noop,
  onRequestCurrentLocation = noop,
  onResetPoints = noop,
  onSetActivePoint = noop,
  origin = null
}) {
  const [originInput, setOriginInput] = useState(formatPointLabel(origin));
  const [destinationInput, setDestinationInput] = useState(formatPointLabel(destination));
  const isLocating = geolocation.status === 'loading';
  const hasSelectedPoint = Boolean(origin || destination);

  useEffect(() => {
    setOriginInput(origin ? formatPointLabel(origin) : '');
  }, [origin]);

  useEffect(() => {
    setDestinationInput(destination ? formatPointLabel(destination) : '');
  }, [destination]);

  return (
    <section className="panel-section" aria-labelledby="route-search-title">
      <h2 id="route-search-title">Route</h2>
      <div className="route-form">
        <fieldset className="selection-mode">
          <legend>Map tap sets</legend>
          <div className="segmented-control">
            <button
              type="button"
              className={activePoint === 'origin' ? 'is-active' : ''}
              aria-pressed={activePoint === 'origin'}
              onClick={() => onSetActivePoint('origin')}
            >
              Origin
            </button>
            <button
              type="button"
              className={activePoint === 'destination' ? 'is-active' : ''}
              aria-pressed={activePoint === 'destination'}
              onClick={() => onSetActivePoint('destination')}
            >
              Destination
            </button>
          </div>
        </fieldset>

        <div className="point-list">
          <PointInput
            activePoint={activePoint}
            isLocating={isLocating}
            name="origin"
            onActivate={onSetActivePoint}
            onChange={setOriginInput}
            onClear={() => {
              setOriginInput('');
              onClearPoint('origin');
            }}
            onUseLocation={onRequestCurrentLocation}
            point={origin}
            title="Origin"
            value={originInput}
          />
          <PointInput
            activePoint={activePoint}
            isLocating={isLocating}
            name="destination"
            onActivate={onSetActivePoint}
            onChange={setDestinationInput}
            onClear={() => {
              setDestinationInput('');
              onClearPoint('destination');
            }}
            onUseLocation={onRequestCurrentLocation}
            point={destination}
            title="Destination"
            value={destinationInput}
          />
        </div>

        <div className="route-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!hasSelectedPoint}
            onClick={onResetPoints}
          >
            Reset
          </button>
        </div>

        {geolocation.errorMessage ? (
          <p className="form-message form-message-error" role="alert">
            {geolocation.errorMessage}
            <button type="button" onClick={onClearGeolocationMessage}>
              Dismiss
            </button>
          </p>
        ) : null}

        {geolocation.status === 'success' ? (
          <p className="form-message" role="status">
            Current location set as {geolocation.pointType ?? 'origin'}.
          </p>
        ) : null}

        <button type="button" className="route-submit" disabled>
          Route calculation comes later
        </button>
      </div>
    </section>
  );
}
