import { useState } from 'react';

import { Dialog } from '../../components/ui/Dialog.jsx';
import { ASSISTANT_NAME, CierzoLogo } from './CierzoLogo.jsx';

/**
 * Floating button over the map that opens Cierzo, the route assistant (#179, #181). A round button
 * with only its logo; the name goes in its accessible name and, on large screens, in a tooltip. The
 * caller shows it only with a calculated route and puts it just above the map legend. The assistant
 * opens in the pop-up of the app: a sheet from the bottom on phones and a centred window on large
 * screens; the focus goes to the request field, Escape or a tap outside closes it and the focus goes
 * back to this button.
 *
 * `children(draft)` draws the assistant: the text being written lives here, so closing the pop-up
 * does not lose it while the route stays.
 */
export function AssistantFab({ isAdjusted = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const label = `Abrir ${ASSISTANT_NAME}, el asistente de rutas`;

  return (
    <>
      <button
        type="button"
        className={`assistant-fab ${isAdjusted ? 'is-adjusted' : ''}`}
        aria-label={isAdjusted ? `${label} (ruta ajustada)` : label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <CierzoLogo />
        <span className="assistant-fab-tooltip" aria-hidden="true">
          {ASSISTANT_NAME}
        </span>
      </button>
      {isOpen && (
        <Dialog
          title={
            <>
              <CierzoLogo />
              {ASSISTANT_NAME} · Asistente de rutas
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
        </Dialog>
      )}
    </>
  );
}
