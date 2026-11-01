import { useRef } from 'react';

import { useSheetHeight } from '../route-search/useSheetHeight.js';
import { formatRouteDistance, formatRouteDuration } from './RouteSummary.jsx';

function getOffRouteMessage(progress) {
  if (!progress?.isOffRoute) return null;
  return progress.hasStarted
    ? 'Te has salido de la ruta. Vuelve a la línea del mapa para seguir.'
    : 'Todavía no estás en la ruta. Dirígete a su inicio, marcado en el mapa.';
}

function getInstruction(progress) {
  if (!progress) return 'Buscando tu ubicación…';
  if (progress.hasArrived) return 'Has llegado a tu destino';
  return progress.instruction ?? 'Sigue la línea del mapa';
}

export function NavigationPanel({ progress, signalLost = false, onStop, onRecenter = null }) {
  const panelRef = useRef(null);
  useSheetHeight(panelRef);
  const offRouteMessage = getOffRouteMessage(progress);
  const hasArrived = Boolean(progress?.hasArrived);
  const showsDistance = !hasArrived && Number.isFinite(progress?.distanceToInstructionM);

  return (
    <section ref={panelRef} className="navigation-panel" aria-labelledby="navigation-title">
      <h2 id="navigation-title" className="visually-hidden">
        Navegación
      </h2>
      {/* Off the route, the next turn would only mislead: the warning takes its place. */}
      {offRouteMessage ? (
        <p className="form-message form-message-error" role="alert">
          {offRouteMessage}
        </p>
      ) : (
        <div className="navigation-instruction" aria-live="polite">
          {showsDistance && (
            <span className="navigation-distance">
              En {formatRouteDistance(progress.distanceToInstructionM)}
            </span>
          )}
          <strong>{getInstruction(progress)}</strong>
        </div>
      )}
      {signalLost && (
        <p className="form-message" role="status">
          Se ha perdido la señal del GPS. Seguimos buscándola…
        </p>
      )}
      <div className="navigation-footer">
        {progress && !hasArrived && (
          <p className="navigation-remaining">
            Quedan <strong>{formatRouteDistance(progress.remainingM)}</strong> ·{' '}
            <strong>{formatRouteDuration(progress.remainingSeconds)}</strong>
          </p>
        )}
        {onRecenter && (
          <button type="button" className="navigation-recenter" onClick={onRecenter}>
            Centrar
          </button>
        )}
        <button type="button" className="navigation-stop" onClick={onStop}>
          Terminar
        </button>
      </div>
    </section>
  );
}
