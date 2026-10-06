import { StatusMessage } from '../../components/ui/StatusMessage.jsx';

export function ComfortSummary() {
  return (
    <section className="panel-section" aria-labelledby="comfort-summary-title">
      <h2 id="comfort-summary-title">Confort</h2>
      <StatusMessage>Los datos de confort aparecerán después de calcular una ruta.</StatusMessage>
    </section>
  );
}
