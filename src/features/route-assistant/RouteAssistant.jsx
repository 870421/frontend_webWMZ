import { useState } from 'react';

import { Icon } from '../../components/ui/Icon.jsx';
import { assistantChanges } from './assistantChanges.js';
import { ASSISTANT_NAME } from './assistantName.js';

// The same limit as the backend (ASSISTANT_MAX_MESSAGE_LENGTH, ADR-033).
export const MAX_MESSAGE_LENGTH = 300;

function ChangeRow({ row }) {
  return (
    <li className={`assistant-change assistant-change-${row.key}`}>
      <span className="assistant-change-name">
        <Icon kind={row.icon} />
        {row.label}
      </span>
      <span className="assistant-change-value">
        {row.beforeText} → {row.afterText}
      </span>
    </li>
  );
}

/**
 * The route assistant (PBI-9.2): the user asks for an adjustment in their own words, the backend
 * turns it into the answers of the panel (PBI-18, ADR-036) and recalculates the route. It shows what
 * changed (before → after, in words). When the assistant fails or does not understand, it says so and the route on screen stays. It is parked
 * (Mejoras_S4): no new functions.
 *
 * It is drawn inside the pop-up of the floating button (#179), which gives it its title. The text
 * being written can come from outside (`message`, `onMessageChange`) so that it survives closing the
 * pop-up.
 */
export function RouteAssistant({
  status = 'idle',
  result = null,
  applied = null,
  errorMessage = '',
  onAsk,
  message: externalMessage,
  onMessageChange,
}) {
  const [ownMessage, setOwnMessage] = useState('');
  const message = externalMessage ?? ownMessage;
  const setMessage = onMessageChange ?? setOwnMessage;
  const isLoading = status === 'loading';
  // The last answer, when it is a notice; the answers applied stay below it.
  const latest = status === 'done' ? result?.assistant : null;
  const notice = latest && latest.status !== 'applied' ? latest : null;
  const rows = applied ? assistantChanges(applied.before, applied.after) : [];
  const text = message.trim();

  async function submit(event) {
    event.preventDefault();
    if (!text || isLoading) return;
    await onAsk(text);
  }

  return (
    <div className="route-assistant">
      <form className="route-assistant-form" onSubmit={submit} noValidate>
        <label htmlFor="route-assistant-message">
          Pide a {ASSISTANT_NAME} un ajuste de la ruta
        </label>
        <div className="route-assistant-row">
          <input
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
            <ul className="assistant-changes" aria-label={`Cambios de ${ASSISTANT_NAME}`}>
              {rows.map((row) => (
                <ChangeRow key={row.key} row={row} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
