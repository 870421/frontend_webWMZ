import { formatRouteDuration } from '../routing/RouteSummary.jsx';

const statusMessages = {
  no_better_alternative:
    'No se ha encontrado una alternativa suficientemente más sombreada dentro del desvío permitido.',
  insufficient_exposure_data: 'No hay datos de exposición suficientes para comparar estas rutas.',
  sun_below_horizon: 'El Sol está bajo el horizonte en el momento seleccionado.',
};

const formatShade = (route) =>
  route?.exposure?.status === 'available'
    ? `${Math.round(route.exposure.shadePercentage)} %`
    : 'No disponible';

export function RouteComparisonPanel({ comparison, selectedRouteType, onSelectRoute }) {
  if (!comparison) return null;
  const hasShadedRoute = Boolean(comparison.shaded);

  return (
    <section className="panel-section route-comparison" aria-labelledby="route-comparison-title">
      <h2 id="route-comparison-title">Comparación</h2>
      <div className="comparison-routes">
        <button
          type="button"
          className={selectedRouteType === 'fastest' ? 'is-selected' : ''}
          aria-pressed={selectedRouteType === 'fastest'}
          onClick={() => onSelectRoute('fastest')}
        >
          <strong>Más rápida</strong>
          <span>{formatRouteDuration(comparison.fastest.duration)}</span>
          <span>{formatShade(comparison.fastest)} de sombra</span>
        </button>
        <button
          type="button"
          className={selectedRouteType === 'shaded' ? 'is-selected' : ''}
          aria-pressed={selectedRouteType === 'shaded'}
          disabled={!hasShadedRoute}
          onClick={() => onSelectRoute('shaded')}
        >
          <strong>Con sombra</strong>
          <span>
            {hasShadedRoute ? formatRouteDuration(comparison.shaded.duration) : 'Sin alternativa'}
          </span>
          <span>{hasShadedRoute ? `${formatShade(comparison.shaded)} de sombra` : '—'}</span>
        </button>
      </div>
      {comparison.status === 'selected' ? (
        <p className="comparison-result">
          La Ruta Sombreada añade {formatRouteDuration(comparison.additionalDurationSeconds)} y
          mejora la sombra en {Math.round(comparison.shadeImprovementPercentagePoints)} puntos.
        </p>
      ) : (
        <p className="comparison-result" role="status">
          {statusMessages[comparison.status] || 'No hay una comparación disponible.'}
        </p>
      )}
    </section>
  );
}
