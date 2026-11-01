import { formatRouteDistance } from './RouteSummary.jsx';

// Streets in the order they are walked, without repeating any.
export function getStreetNames(steps) {
  return [...new Set(steps.map(({ name }) => name).filter(Boolean))];
}

export function RouteSteps({ steps, isOpen, onToggle, selectedStepIndex = null, onSelectStep }) {
  if (!steps.length) return null;
  const streetNames = getStreetNames(steps);

  return (
    <section
      className={`route-steps ${isOpen ? 'is-open' : ''}`}
      aria-labelledby="route-steps-title"
    >
      <div className="route-steps-header">
        <h2 id="route-steps-title">Recorrido</h2>
        <button type="button" aria-expanded={isOpen} onClick={onToggle}>
          {isOpen ? 'Ocultar recorrido' : 'Ver recorrido'}
        </button>
      </div>
      {isOpen && (
        <>
          {streetNames.length > 0 && (
            <p className="route-steps-streets">Pasas por {streetNames.join(', ')}.</p>
          )}
          <ol className="route-steps-list">
            {steps.map((step, index) => (
              <li key={`${step.wayPoints.join('-')}-${step.instruction}`}>
                <button
                  type="button"
                  aria-pressed={selectedStepIndex === index}
                  onClick={() => onSelectStep(index)}
                >
                  <span>{step.instruction}</span>
                  {step.distance > 0 && <small>{formatRouteDistance(step.distance)}</small>}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
