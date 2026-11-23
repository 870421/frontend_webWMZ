import { hasPreference, minutesText, preferencesSummary } from './preferenceTexts.js';

const answers = (overrides = {}) => ({
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
  ...overrides,
});

describe('words of the simple preferences (PBI-18)', () => {
  it.each([
    [
      answers({ sunShade: 'sun', preferParks: true, extraMinutes: 10 }),
      'Sol · Por parques · +10 min',
    ],
    [answers({ sunShade: 'shade', avoidWind: true }), 'Sombra · Evitar el viento · +5 min'],
    [answers({ avoidWind: true, extraMinutes: 0 }), 'Evitar el viento · Sin minutos extra'],
    [answers(), 'Me da igual · La más rápida'],
  ])('%j is summed up as "%s"', (preferences, summary) => {
    expect(preferencesSummary(preferences)).toBe(summary);
  });

  it('only has a preference when some answer is not indifferent', () => {
    expect(hasPreference(answers())).toBe(false);
    expect(hasPreference(answers({ extraMinutes: 15 }))).toBe(false);
    expect(hasPreference(answers({ sunShade: 'sun' }))).toBe(true);
    expect(hasPreference(answers({ preferParks: true }))).toBe(true);
  });

  it('writes the minutes as the buttons of the sketches', () => {
    expect([0, 2, 5, 10, 15].map(minutesText)).toEqual(['Nada', '+2', '+5', '+10', '+15']);
  });
});
