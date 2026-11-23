import { SUN_SHADE_CHOICES, hasPreference } from '../route-preferences/preferenceTexts.js';

const sunShadeText = (value) => SUN_SHADE_CHOICES.find((choice) => choice.value === value).label;
const yesNo = (value) => (value ? 'Sí' : 'No');
// With every answer indifferent the route is the fastest one: the minutes do not count then.
const minutesText = (preferences) => {
  if (!hasPreference(preferences)) return 'La más rápida';
  return preferences.extraMinutes === 0 ? 'Nada' : `+${preferences.extraMinutes} min`;
};

/**
 * The rows of what the assistant changed (PBI-9.2), in the words of the questions of the panel
 * (PBI-18, ADR-036): shade or sun, wind, parks and the extra minutes. No weights or percentages.
 */
export function assistantChanges(before, after) {
  const rows = [];
  if (before.sunShade !== after.sunShade) {
    rows.push({
      key: 'sunShade',
      icon: after.sunShade === 'sun' || before.sunShade === 'sun' ? 'sun' : 'shade',
      label: 'Sombra o sol',
      beforeText: sunShadeText(before.sunShade),
      afterText: sunShadeText(after.sunShade),
    });
  }
  [
    { key: 'avoidWind', icon: 'wind', label: 'Evitar el viento' },
    { key: 'preferParks', icon: 'vegetation', label: 'Por parques' },
  ].forEach(({ key, icon, label }) => {
    if (before[key] !== after[key]) {
      rows.push({ key, icon, label, beforeText: yesNo(before[key]), afterText: yesNo(after[key]) });
    }
  });
  const beforeMinutes = minutesText(before);
  const afterMinutes = minutesText(after);
  if (beforeMinutes !== afterMinutes) {
    rows.push({
      key: 'extraMinutes',
      icon: 'time',
      label: 'Tiempo extra',
      beforeText: beforeMinutes,
      afterText: afterMinutes,
    });
  }
  return rows;
}
