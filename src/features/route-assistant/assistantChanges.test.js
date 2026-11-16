import { assistantChanges } from './assistantChanges.js';

const setting = (weights, maxDetourPercentage = 25) => ({
  weights: { shade: 0, sun: 0, wind: 0, vegetation: 0, ...weights },
  maxDetourPercentage,
});

describe('assistantChanges', () => {
  it('shows shade and sun as one scale, as the editor does', () => {
    expect(assistantChanges(setting({ sun: 30 }), setting({ shade: 50 }))).toEqual([
      {
        key: 'shadeSun',
        label: 'Sombra o sol',
        before: 30,
        after: -50,
        beforeText: 'Sol 30 %',
        afterText: 'Sombra 50 %',
      },
    ]);
  });

  it('lists wind, green and the extra time in the order of the editor', () => {
    const rows = assistantChanges(setting({}), setting({ wind: 50, vegetation: 60 }, 40));
    expect(rows.map(({ key, beforeText, afterText }) => [key, beforeText, afterText])).toEqual([
      ['wind', '0 %', '50 %'],
      ['vegetation', '0 %', '60 %'],
      ['time', 'Sin rodeo', '+40 %'],
    ]);
  });

  it('back to the fastest route: the extra time says there is no detour', () => {
    const rows = assistantChanges(setting({ shade: 50 }, 35), setting({}, 35));
    expect(rows.map(({ key, afterText }) => [key, afterText])).toEqual([
      ['shadeSun', 'Neutro'],
      ['time', 'Sin rodeo'],
    ]);
  });

  it('is empty when nothing that matters changes', () => {
    expect(assistantChanges(setting({}, 25), setting({}, 40))).toEqual([]);
  });
});
