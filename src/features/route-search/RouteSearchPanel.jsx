import { useState } from 'react';
import { usePlaceAutocomplete } from './usePlaceAutocomplete.js';

const noop = () => {};

function PointInput({ name, title, value, point, activePoint, isLocating,
  onActivate, onEditPoint, onClearPoint, onSetPoint, onRequestCurrentLocation }) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const open = focused && !dismissed && activePoint === name && !point && value.trim().length >= 3;
  const search = usePlaceAutocomplete(value, open, name);
  const listId = `${name}-suggestions`;
  const selectedIndex = highlight < search.results.length ? highlight : -1;

  function choose(result) {
    setDismissed(true);
    setHighlight(-1);
    onSetPoint(name, { lat: result.lat, lng: result.lng, label: result.label, source: 'search' });
  }

  function handleKey(event) {
    if (event.key === 'Escape') {
      setDismissed(true);
      setHighlight(-1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setDismissed(false);
      if (search.results.length) {
        setHighlight((index) => event.key === 'ArrowDown'
          ? (index + 1) % search.results.length
          : (index <= 0 ? search.results.length : index) - 1);
      }
    }
    if (event.key === 'Enter' && open && selectedIndex >= 0) {
      event.preventDefault();
      choose(search.results[selectedIndex]);
    }
  }

  return (
    <div className="point-field">
      <label htmlFor={name}>{title}</label>
      <input id={name} name={name} type="text" inputMode="search" autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
        aria-describedby={`${name}-coordinates`} maxLength={200}
        placeholder="Search a place or tap the map" value={value}
        onFocus={() => { setFocused(true); setDismissed(false); onActivate(name); }}
        onBlur={() => { setFocused(false); setHighlight(-1); }}
        onChange={(event) => {
          setDismissed(false); setHighlight(-1); onEditPoint(name, event.target.value);
        }}
        onKeyDown={handleKey}
      />
      {open && (
        <div className="autocomplete-panel">
          <ul id={listId} className="autocomplete-results" role="listbox" aria-label={`${title} places`} aria-busy={search.isLoading}>
            {search.results.map((result, index) => (
              <li key={result.id} id={`${listId}-${index}`} role="option"
                aria-selected={selectedIndex === index}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(result)}>
                {result.label}
              </li>
            ))}
          </ul>
          {search.isLoading && <p className="autocomplete-message" role="status">Searching places...</p>}
          {search.errorMessage && <p className="autocomplete-message autocomplete-error" role="alert">{search.errorMessage}</p>}
          {!search.isLoading && !search.errorMessage && search.results.length === 0 &&
            <p className="autocomplete-message" role="status">No places found. Try another address or select on the map.</p>}
        </div>
      )}
      <p id={`${name}-coordinates`} className="point-coordinate" aria-live="polite">
        {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'Not selected'}
      </p>
      <div className="point-actions">
        <button type="button" className="secondary-button" aria-label={`Use GPS for ${name}`}
          disabled={isLocating} onClick={() => { setDismissed(true); onRequestCurrentLocation(name); }}>Use GPS</button>
        <button type="button" className="secondary-button" aria-label={`Clear ${name}`}
          disabled={!point && !value} onClick={() => { setDismissed(true); onClearPoint(name); }}>Clear</button>
      </div>
      {activePoint === name && <span className="active-point-note">Map tap target</span>}
    </div>
  );
}

export function RouteSearchPanel({
  activePoint = 'origin', origin = null, destination = null, originInput = '', destinationInput = '',
  geolocation = { status: 'idle', errorMessage: '' }, onSetActivePoint = noop,
  onEditPoint = noop, onClearPoint = noop, onSetPoint = noop, onResetPoints = noop,
  onRequestCurrentLocation = noop, onClearGeolocationMessage = noop
}) {
  const isLocating = geolocation.status === 'loading';
  return (
    <section className="panel-section" aria-labelledby="route-search-title">
      <h2 id="route-search-title">Route</h2>
      <div className="route-form">
        <fieldset className="selection-mode">
          <legend>Map tap sets</legend>
          <div className="segmented-control">
            {['origin', 'destination'].map((name) => (
              <button key={name} type="button" className={activePoint === name ? 'is-active' : ''}
                aria-pressed={activePoint === name} onClick={() => onSetActivePoint(name)}>
                {name === 'origin' ? 'Origin' : 'Destination'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="point-list">
          {['origin', 'destination'].map((name) => (
            <PointInput key={name} name={name} title={name === 'origin' ? 'Origin' : 'Destination'}
              value={name === 'origin' ? originInput : destinationInput}
              point={name === 'origin' ? origin : destination}
              activePoint={activePoint} isLocating={isLocating} onActivate={onSetActivePoint}
              onEditPoint={onEditPoint} onClearPoint={onClearPoint} onSetPoint={onSetPoint}
              onRequestCurrentLocation={onRequestCurrentLocation} />
          ))}
        </div>
        <button type="button" className="secondary-button"
          disabled={!origin && !destination && !originInput && !destinationInput && geolocation.status === 'idle'}
          onClick={onResetPoints}>Reset</button>
        {geolocation.errorMessage && <div className="form-message form-message-error" role="alert">
          {geolocation.errorMessage}
          <button type="button" onClick={onClearGeolocationMessage}>Dismiss</button>
        </div>}
        {isLocating && <div className="form-message" role="status">
          Getting current location...
          <button type="button" onClick={onClearGeolocationMessage}>Cancel location</button>
        </div>}
        {geolocation.status === 'success' && <p className="form-message" role="status">
          Current location set as {geolocation.pointType}.
        </p>}
        <button type="button" className="route-submit" disabled>Route calculation comes later</button>
      </div>
    </section>
  );
}
