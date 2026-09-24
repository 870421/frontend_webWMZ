import { StatusMessage } from '../../components/ui/StatusMessage.jsx';

export function RouteComparisonPanel() {
  return (
    <section className="panel-section" aria-labelledby="route-comparison-title">
      <h2 id="route-comparison-title">Comparison</h2>
      <StatusMessage>Select an origin and destination to compare routes.</StatusMessage>
    </section>
  );
}

