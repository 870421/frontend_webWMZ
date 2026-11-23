// The words of the simple preferences (PBI-18, ADR-036), as in the sketches of the team (Mejoras_S4).
// No weights or percentages are shown: only answers and minutes.

export const SUN_SHADE_CHOICES = [
  { value: 'shade', label: 'Sombra', icon: 'shade' },
  { value: 'sun', label: 'Sol', icon: 'sun' },
  { value: 'any', label: 'Me da igual', icon: null },
];

export const MINUTE_CHOICES = [0, 2, 5, 10, 15];

export const hasPreference = ({ sunShade, avoidWind, preferParks }) =>
  sunShade !== 'any' || avoidWind || preferParks;

export const minutesText = (minutes) => (minutes === 0 ? 'Nada' : `+${minutes}`);

// The answers behind some weights (> 0 is "yes"). Only for the provisional "Según el tiempo", whose
// weights come from the backend (the recommended route of PBI-9.1), so that the route assistant can
// start from them (ADR-036).
export function answersFromWeights(weights = {}) {
  let sunShade = 'any';
  if (weights.shade > 0) sunShade = 'shade';
  else if (weights.sun > 0) sunShade = 'sun';
  return { sunShade, avoidWind: weights.wind > 0, preferParks: weights.vegetation > 0 };
}

// "Sol · Por parques · +10 min"; with every answer indifferent, the fastest route.
export function preferencesSummary(preferences) {
  if (!hasPreference(preferences)) return 'Me da igual · La más rápida';
  const sunShade = SUN_SHADE_CHOICES.find(({ value }) => value === preferences.sunShade);
  return [
    preferences.sunShade !== 'any' && sunShade.label,
    preferences.avoidWind && 'Evitar el viento',
    preferences.preferParks && 'Por parques',
    preferences.extraMinutes === 0 ? 'Sin minutos extra' : `+${preferences.extraMinutes} min`,
  ]
    .filter(Boolean)
    .join(' · ');
}
