import { StatusMessage } from '../../components/ui/StatusMessage.jsx';

export function ComfortSummary() {
  return (
    <section className="panel-section" aria-labelledby="comfort-summary-title">
      <h2 id="comfort-summary-title">Comfort</h2>
      <StatusMessage>Comfort data will appear after a route is calculated.</StatusMessage>
    </section>
  );
}

