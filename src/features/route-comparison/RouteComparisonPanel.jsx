import { formatRouteDistance, formatRouteDuration } from '../routing/RouteSummary.jsx';

const statusMessages = {
  no_better_alternative:
    'No se ha encontrado una alternativa suficientemente más sombreada dentro del desvío permitido.',
  insufficient_exposure_data: 'No hay datos de exposición suficientes para comparar estas rutas.',
  sun_below_horizon: 'El Sol está bajo el horizonte en el momento seleccionado.',
  sun_too_low:
    'El Sol está demasiado bajo en el momento seleccionado para estimar la sombra. Prueba con una hora más central del día.',
};

// Without shade to compare, the reason must stay visible on small screens: the cards do not explain
// it. "No better alternative" is already readable from the disabled card.
const REASON_ALWAYS_VISIBLE = ['insufficient_exposure_data', 'sun_below_horizon', 'sun_too_low'];

const formatShade = (route) =>
  route?.exposure?.status === 'available'
    ? `${Math.round(route.exposure.shadePercentage)} % de sombra`
    : 'Sombra no disponible';

function RouteTimeAndDistance({ route }) {
  return (
    <span>
      {formatRouteDuration(route.duration)}
      {Number.isFinite(route.distance) && (
        <span className="comparison-distance"> · {formatRouteDistance(route.distance)}</span>
      )}
    </span>
  );
}

export function RouteComparisonPanel({
  comparison,
  selectedRouteType,
  onSelectRoute,
  isExpanded = true,
  onToggleExpanded = null,
}) {
  if (!comparison) return null;
  const hasShadedRoute = Boolean(comparison.shaded);
  const showsShadedRoute = selectedRouteType === 'shaded' && hasShadedRoute;
  const selectedRoute = showsShadedRoute ? comparison.shaded : comparison.fastest;
  const resultClass = REASON_ALWAYS_VISIBLE.includes(comparison.status)
    ? 'comparison-result comparison-result-important'
    : 'comparison-result';

  return (
    <section
      className={`panel-section route-comparison ${isExpanded ? '' : 'is-collapsed'}`}
      aria-labelledby="route-comparison-title"
    >
      <div className="comparison-header">
        <h2 id="route-comparison-title">Comparación</h2>
        {!isExpanded && (
          <p className="comparison-collapsed-summary">
            <strong>{showsShadedRoute ? 'Con sombra' : 'Más rápida'}</strong>
            {` · ${formatRouteDuration(selectedRoute.duration)} · ${formatShade(selectedRoute)}`}
          </p>
        )}
        {onToggleExpanded && (
          <button
            type="button"
            className="comparison-toggle"
            aria-expanded={isExpanded}
            onClick={onToggleExpanded}
          >
            {isExpanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>
      <div className="comparison-routes">
        <button
          type="button"
          className={selectedRouteType === 'fastest' ? 'is-selected' : ''}
          aria-pressed={selectedRouteType === 'fastest'}
          onClick={() => onSelectRoute('fastest')}
        >
          <strong>Más rápida</strong>
          <RouteTimeAndDistance route={comparison.fastest} />
          <span>{formatShade(comparison.fastest)}</span>
        </button>
        <button
          type="button"
          className={selectedRouteType === 'shaded' ? 'is-selected' : ''}
          aria-pressed={selectedRouteType === 'shaded'}
          disabled={!hasShadedRoute}
          onClick={() => onSelectRoute('shaded')}
        >
          <strong>Con sombra</strong>
          {hasShadedRoute ? (
            <>
              <RouteTimeAndDistance route={comparison.shaded} />
              <span>{formatShade(comparison.shaded)}</span>
            </>
          ) : (
            <span>Sin alternativa</span>
          )}
        </button>
      </div>
      {comparison.status === 'selected' ? (
        <p className={resultClass}>
          La Ruta Sombreada añade {formatRouteDuration(comparison.additionalDurationSeconds)} y
          mejora la sombra en {Math.round(comparison.shadeImprovementPercentagePoints)} puntos.
        </p>
      ) : (
        <p className={resultClass} role="status">
          {statusMessages[comparison.status] || 'No hay una comparación disponible.'}
        </p>
      )}
    </section>
  );
}
