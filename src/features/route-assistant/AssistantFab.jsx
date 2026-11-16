import { useState } from 'react';

import { ProfileDialog } from '../route-profiles/ProfileDialog.jsx';
import { ProfileIcon } from '../route-profiles/ProfileIcon.jsx';

/**
 * Floating button over the map that opens the route assistant (#179). The caller shows it only with
 * a calculated route. The assistant opens in the pop-up of the app: a sheet from the bottom on
 * phones and a centred window on large screens; the focus goes to the request field, Escape or a
 * tap outside closes it and the focus goes back to this button.
 *
 * `children(draft)` draws the assistant: the text being written lives here, so closing the pop-up
 * does not lose it while the route stays.
 */
export function AssistantFab({ isAdjusted = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <>
      <button
        type="button"
        className={`assistant-fab ${isAdjusted ? 'is-adjusted' : ''}`}
        aria-label={
          isAdjusted ? 'Abrir el asistente de rutas (ruta ajustada)' : 'Abrir el asistente de rutas'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <ProfileIcon kind="assistant" />
        <span className="assistant-fab-text" aria-hidden="true">
          Asistente
        </span>
      </button>
      {isOpen && (
        <ProfileDialog
          title={
            <>
              <ProfileIcon kind="assistant" />
              Asistente
            </>
          }
          onClose={() => setIsOpen(false)}
        >
          {children({ message, onMessageChange: setMessage })}
          <div className="profile-dialog-actions">
            <button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>
              Cerrar
            </button>
          </div>
        </ProfileDialog>
      )}
    </>
  );
}
