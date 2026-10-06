import { StatusMessage } from '../../components/ui/StatusMessage.jsx';

export function RouteComparisonPanel() {
  return (
    <section className="panel-section" aria-labelledby="route-comparison-title">
      <h2 id="route-comparison-title">Comparación</h2>
      <StatusMessage>Selecciona un origen y un destino para comparar rutas.</StatusMessage>
    </section>
  );
}
