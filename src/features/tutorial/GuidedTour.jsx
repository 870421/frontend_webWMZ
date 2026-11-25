import { useEffect, useRef, useState } from 'react';

export const TOUR_STEPS = [
  {
    target: '[data-tour="points"]',
    title: 'Origen y destino',
    text: 'Elige de dónde sales y adónde quieres llegar. Puedes escribir una dirección, usar tu ubicación o tocar el mapa.',
  },
  {
    target: '[data-tour="preferences"]',
    title: 'Elige cómo quieres ir',
    text: 'Elige sombra o sol, evitar el viento o pasar por parques. Si no cambias nada, se calcula la ruta más rápida.',
  },
  {
    target: '[data-tour="extra-time"]',
    title: 'Ajusta el tiempo extra',
    text: 'Al elegir una preferencia aparece este control. Elige cuánto más estás dispuesto a tardar para priorizarla.',
  },
  {
    target: '[data-tour="calculate-route"]',
    title: 'Calcula y compara',
    text: 'Pulsa Calcular ruta. Verás duración y distancia y, cuando haya datos, la sombra estimada. Si existe una alternativa, podrás compararla con la ruta más rápida.',
  },
  {
    target: '[data-tour="start-navigation"]',
    fallback: '[data-tour="calculate-route"]',
    title: 'Empieza la navegación',
    text: 'Después de calcular, el botón de esta zona cambiará a Iniciar ruta. Al pulsarlo, se activa la navegación GPS con instrucciones y tu posición en el mapa.',
  },
  {
    target: '[data-tour="current-weather"]',
    title: 'Consulta el tiempo actual',
    text: 'Aquí puedes consultar la temperatura, el estado del cielo y el viento actuales en Zaragoza. En tu perfil también tienes acceso a tus favoritos y a este tutorial.',
  },
];

export function GuidedTour({ step, onPrevious, onNext, onSkip, saving = false, error = '' }) {
  const dialog = useRef(null);
  const [rect, setRect] = useState(null);
  const stepInfo = TOUR_STEPS[step];
  const target =
    document.querySelector(stepInfo.target) ||
    (stepInfo.fallback ? document.querySelector(stepInfo.fallback) : null);
  const isDesktop = window.innerWidth >= 1100;
  const cardWidth = Math.min(544, window.innerWidth * 0.42);
  const cardHeight = 440;
  const placeRight = rect ? rect.left + rect.width / 2 < window.innerWidth / 2 : true;
  const cardClasses = ['guided-tour-card'];
  if (isDesktop && rect) {
    cardClasses.push('is-anchored');
    cardClasses.push(placeRight ? 'is-right-of-target' : 'is-left-of-target');
  }
  const left = rect
    ? Math.max(
        16,
        Math.min(
          window.innerWidth - cardWidth - 16,
          placeRight ? rect.left + rect.width + 24 : rect.left - cardWidth - 24
        )
      )
    : 0;
  const top = rect
    ? Math.max(
        16,
        Math.min(window.innerHeight - cardHeight - 16, rect.top + rect.height / 2 - cardHeight / 2)
      )
    : 0;

  useEffect(() => {
    const updateRect = () => {
      const bounds = target?.getBoundingClientRect();
      setRect(
        bounds
          ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }
          : null
      );
    };
    const timer = window.setTimeout(updateRect, 0);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [target, step]);

  useEffect(() => {
    dialog.current?.focus();
    target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [step, target]);

  function keyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onSkip();
    }
    if (event.key === 'Tab') {
      const items = Array.from(dialog.current.querySelectorAll('button:not(:disabled)'));
      const first = items[0];
      const last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="guided-tour-layer" onKeyDown={keyDown}>
      {!rect && <div aria-hidden="true" className="guided-tour-backdrop" />}
      {rect && (
        <div
          aria-hidden="true"
          className="guided-tour-highlight"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <section
        ref={dialog}
        className={cardClasses.join(' ')}
        style={isDesktop && rect ? { left, top } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-description"
        tabIndex={-1}
      >
        <div className="guided-tour-header">
          <p className="guided-tour-progress" aria-live="polite">
            Paso {step + 1} de {TOUR_STEPS.length}
          </p>
          <button type="button" className="guided-tour-skip" disabled={saving} onClick={onSkip}>
            {saving ? 'Guardando…' : 'Saltar tutorial'}
          </button>
        </div>
        <h2 id="guided-tour-title">{stepInfo.title}</h2>
        <p id="guided-tour-description">{stepInfo.text}</p>
        <div className="guided-tour-dots" aria-hidden="true">
          {TOUR_STEPS.map((tourStep, index) => (
            <span
              key={tourStep.title}
              className={[
                'guided-tour-dot',
                index === step && 'is-active',
                index < step && 'is-complete',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="form-message-error">
            No se ha podido guardar el estado: {error}
          </p>
        )}
        <div className="guided-tour-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={step === 0 || saving}
            onClick={onPrevious}
          >
            Atrás
          </button>
          <button type="button" className="route-submit" disabled={saving} onClick={onNext}>
            {step === TOUR_STEPS.length - 1 ? 'Terminar' : 'Siguiente'}
          </button>
        </div>
      </section>
    </div>
  );
}
