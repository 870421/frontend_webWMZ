import { assistantChanges } from './assistantChanges.js';

// The answers of the panel (PBI-18, ADR-036).
const answers = (overrides = {}) => ({
  sunShade: 'any',
  avoidWind: false,
  preferParks: false,
  extraMinutes: 5,
  ...overrides,
});
const summary = (rows) =>
  rows.map(({ key, beforeText, afterText }) => [key, beforeText, afterText]);

describe('assistantChanges', () => {
  it('speaks of the answers, in the order of the questions, without weights or percentages', () => {
    const rows = assistantChanges(
      answers({ sunShade: 'sun' }),
      answers({ sunShade: 'shade', avoidWind: true, preferParks: true, extraMinutes: 15 })
    );

    expect(summary(rows)).toEqual([
      ['sunShade', 'Sol', 'Sombra'],
      ['avoidWind', 'No', 'Sí'],
      ['preferParks', 'No', 'Sí'],
      ['extraMinutes', '+5 min', '+15 min'],
    ]);
    expect(rows.map(({ icon }) => icon)).toEqual(['sun', 'wind', 'vegetation', 'time']);
  });

  it('only lists what changes', () => {
    expect(summary(assistantChanges(answers({ sunShade: 'shade' }), answers()))).toEqual([
      ['sunShade', 'Sombra', 'Me da igual'],
      ['extraMinutes', '+5 min', 'La más rápida'],
    ]);
    expect(assistantChanges(answers(), answers())).toEqual([]);
  });

  it('says "Nada" for no extra minutes and ignores them when every answer is indifferent', () => {
    expect(
      summary(
        assistantChanges(
          answers({ avoidWind: true }),
          answers({ avoidWind: true, extraMinutes: 0 })
        )
      )
    ).toEqual([['extraMinutes', '+5 min', 'Nada']]);
    expect(assistantChanges(answers(), answers({ extraMinutes: 15 }))).toEqual([]);
  });

  it('uses the shade icon for shade', () => {
    expect(assistantChanges(answers(), answers({ sunShade: 'shade' }))[0].icon).toBe('shade');
  });
});
