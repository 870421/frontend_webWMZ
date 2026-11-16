import { balanceText, shadeSunBalance } from '../route-profiles/shadeSun.js';

const hasWeight = (weights) =>
  weights.shade > 0 || weights.sun > 0 || weights.wind > 0 || weights.vegetation > 0;

const percentText = (value) => `${value} %`;

/**
 * The rows of what the assistant changed, as the route editor shows them: shade and sun are one
 * scale (ADR-030), then wind, green and the extra time. The extra time only counts when some weight
 * does (with every weight at 0 the route is the fastest one).
 */
export function assistantChanges(before, after) {
  const rows = [];
  const shadeSunBefore = shadeSunBalance(before.weights);
  const shadeSunAfter = shadeSunBalance(after.weights);
  if (shadeSunBefore !== shadeSunAfter) {
    rows.push({
      key: 'shadeSun',
      label: 'Sombra o sol',
      before: shadeSunBefore,
      after: shadeSunAfter,
      beforeText: balanceText(shadeSunBefore),
      afterText: balanceText(shadeSunAfter),
    });
  }
  [
    { key: 'wind', label: 'Evitar viento' },
    { key: 'vegetation', label: 'Verde' },
  ].forEach(({ key, label }) => {
    if (before.weights[key] !== after.weights[key]) {
      rows.push({
        key,
        label,
        before: before.weights[key],
        after: after.weights[key],
        beforeText: percentText(before.weights[key]),
        afterText: percentText(after.weights[key]),
      });
    }
  });
  const detourText = (setting) =>
    hasWeight(setting.weights) ? `+${setting.maxDetourPercentage} %` : 'Sin rodeo';
  const beforeDetour = detourText(before);
  const afterDetour = detourText(after);
  if (beforeDetour !== afterDetour) {
    rows.push({
      key: 'time',
      label: 'Tiempo extra máximo',
      before: before.maxDetourPercentage,
      after: after.maxDetourPercentage,
      beforeText: beforeDetour,
      afterText: afterDetour,
    });
  }
  return rows;
}
