import { useEffect, useRef, useState } from 'react';

import { ProfileIcon } from '../route-profiles/ProfileIcon.jsx';
import { RouteProfileEditor } from '../route-profiles/RouteProfileEditor.jsx';
import { findNameConflict, suggestFreeName } from '../route-profiles/profileNames.js';
import { SHADE_SUN_MAX } from '../route-profiles/shadeSun.js';
import { assistantChanges } from './assistantChanges.js';
import { ASSISTANT_NAME } from './assistantName.js';

// The same limit as the backend (ASSISTANT_MAX_MESSAGE_LENGTH, ADR-033).
export const MAX_MESSAGE_LENGTH = 300;
// The default name of a route saved from the assistant (#181).
const SAVED_NAME = `Ruta de ${ASSISTANT_NAME}`;

const ROW_ICONS = { shadeSun: null, wind: 'wind', vegetation: 'vegetation', time: 'time' };

// The read-only shade-sun scale of the route editor and the recommended route (ADR-030).
function ShadeSunScale({ value, label }) {
  const fill = { left: `${50 - Math.max(0, -value) / 2}%`, width: `${Math.abs(value) / 2}%` };
  return (
    <span
      className={`shade-sun-scale ${value > 0 ? 'is-sun' : 'is-shade'}`}
      role="meter"
      aria-label={label}
      aria-valuemin={-SHADE_SUN_MAX}
      aria-valuemax={SHADE_SUN_MAX}
      aria-valuenow={value}
    >
      <span className="shade-sun-scale-fill" style={fill} />
    </span>
  );
}

function ChangeScale({ row, moment }) {
  const value = row[moment];
  const label = `${row.label} ${moment === 'before' ? 'antes' : 'después'}`;
  if (row.key === 'shadeSun') return <ShadeSunScale value={value} label={label} />;
  if (row.key === 'time') return null;
  return <meter min="0" max="100" value={value} aria-label={label} />;
}

// Shade or sun: the side the route ends on (or comes from, when it goes back to neutral).
function shadeSunIcon({ before, after }) {
  return (after !== 0 ? after : before) > 0 ? 'sun' : 'shade';
}

function ChangeRow({ row }) {
  const icon = ROW_ICONS[row.key] ?? shadeSunIcon(row);
  return (
    <li className={`assistant-change assistant-change-${row.key}`}>
      <span className="assistant-change-name">
        <ProfileIcon kind={icon} />
        {row.label}
      </span>
      {row.key !== 'time' && (
        <span className="assistant-change-scales" aria-hidden="true">
          <ChangeScale row={row} moment="before" />
          <span className="assistant-change-arrow">→</span>
          <ChangeScale row={row} moment="after" />
        </span>
      )}
      <span className="assistant-change-value">
        {row.beforeText} → {row.afterText}
      </span>
    </li>
  );
}

function freeName(profiles) {
  return findNameConflict(profiles, SAVED_NAME)
    ? suggestFreeName(SAVED_NAME, profiles)
    : SAVED_NAME;
}

/**
 * The route assistant (PBI-9.2): the user asks for an adjustment in their own words, the backend
 * turns it into weights and recalculates the route. It shows what changed (before → after, with the
 * icons and scales of the route editor) and can save those weights as a route of the user. When the
 * assistant fails or does not understand, it says so and the route on screen stays.
 *
 * It is drawn inside the pop-up of the floating button (#179), which gives it its title. The text
 * being written can come from outside (`message`, `onMessageChange`) so that it survives closing the
 * pop-up. "Guardar como ruta" shows the route editor in its place, inside the same pop-up: a second
 * pop-up on top would close together with it on Escape.
 */
export function RouteAssistant({
  status = 'idle',
  result = null,
  applied = null,
  errorMessage = '',
  canSave = false,
  profiles = [],
  onAsk,
  onSaveProfile,
  onReplaceProfile,
  message: externalMessage,
  onMessageChange,
}) {
  const [ownMessage, setOwnMessage] = useState('');
  const message = externalMessage ?? ownMessage;
  const setMessage = onMessageChange ?? setOwnMessage;
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);
  const saveButtonRef = useRef(null);
  const messageRef = useRef(null);
  const wasSaving = useRef(false);

  // The editor takes the place of the assistant: the focus goes to it and, when it closes, back to
  // "Guardar como ruta" (or to the request field, when that button is gone).
  useEffect(() => {
    if (isSaving) editorRef.current?.querySelector('input, button')?.focus();
    else if (wasSaving.current) (saveButtonRef.current ?? messageRef.current)?.focus();
    wasSaving.current = isSaving;
  }, [isSaving]);
  const [savedName, setSavedName] = useState('');
  const isLoading = status === 'loading';
  // The last answer, when it is a notice; the weights applied stay below it.
  const latest = status === 'done' ? result?.assistant : null;
  const notice = latest && latest.status !== 'applied' ? latest : null;
  const rows = applied ? assistantChanges(applied.before, applied.after) : [];
  const text = message.trim();

  async function submit(event) {
    event.preventDefault();
    if (!text || isLoading) return;
    setSavedName('');
    await onAsk(text);
  }

  async function save(draft) {
    const saved = await onSaveProfile(draft);
    setIsSaving(false);
    setSavedName(saved.name);
  }

  async function replace(existingId, draft) {
    // A new route: nothing is deleted, only the weights of the existing one change.
    const saved = await onReplaceProfile(existingId, draft);
    setIsSaving(false);
    setSavedName(saved.name);
  }

  if (applied && isSaving) {
    return (
      <section
        ref={editorRef}
        className="route-assistant"
        aria-labelledby="route-assistant-save-title"
      >
        <h3 id="route-assistant-save-title" className="route-assistant-save-title">
          Guardar como ruta
        </h3>
        <RouteProfileEditor
          initialValues={{
            name: freeName(profiles),
            weights: applied.after.weights,
            maxDetourPercentage: applied.after.maxDetourPercentage,
          }}
          profiles={profiles}
          onSave={save}
          onReplace={replace}
          onCancel={() => setIsSaving(false)}
        />
      </section>
    );
  }

  return (
    <div className="route-assistant">
      <form className="route-assistant-form" onSubmit={submit} noValidate>
        <label htmlFor="route-assistant-message">
          Pide a {ASSISTANT_NAME} un ajuste de la ruta
        </label>
        <div className="route-assistant-row">
          <input
            ref={messageRef}
            id="route-assistant-message"
            type="text"
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Por ejemplo, prefiero la sombra aunque tarde más"
            autoComplete="off"
            enterKeyHint="send"
            aria-describedby="route-assistant-help"
            onChange={(event) => setMessage(event.target.value)}
          />
          <button type="submit" className="route-assistant-submit" disabled={!text || isLoading}>
            {isLoading ? 'Ajustando...' : 'Ajustar'}
          </button>
        </div>
        <small id="route-assistant-help" className="route-assistant-help">
          Se envía a un servicio externo de IA: no escribas datos personales. {message.length}/
          {MAX_MESSAGE_LENGTH}
        </small>
      </form>
      {/* Always present, so that screen readers announce what happens. */}
      <div className="route-assistant-result" aria-live="polite">
        {isLoading && <p className="form-message">{ASSISTANT_NAME} está ajustando tu ruta...</p>}
        {status === 'error' && <p className="form-message form-message-error">{errorMessage}</p>}
        {notice && (
          <p className="form-message">
            {notice.message}
            {notice.explanation ? ` ${notice.explanation}` : ''}
          </p>
        )}
        {applied && (
          <>
            <p className="route-assistant-explanation">{applied.explanation}</p>
            <ul className="assistant-changes" aria-label={`Pesos cambiados por ${ASSISTANT_NAME}`}>
              {rows.map((row) => (
                <ChangeRow key={row.key} row={row} />
              ))}
            </ul>
            {savedName && <p className="form-message">Guardada en tus rutas como «{savedName}».</p>}
          </>
        )}
      </div>
      {applied && canSave && (
        <button
          ref={saveButtonRef}
          type="button"
          className="secondary-button route-assistant-save"
          onClick={() => setIsSaving(true)}
        >
          Guardar como ruta
        </button>
      )}
    </div>
  );
}
