import { balanceText, shadeSunBalance } from './shadeSun.js';

describe('shade-sun scale (ADR-030)', () => {
  it.each([
    [{ shade: 50, sun: 0 }, -50, 'Sombra 50 %'],
    [{ shade: 0, sun: 30 }, 30, 'Sol 30 %'],
    [{ shade: 0, sun: 0 }, 0, 'Neutro'],
    [{}, 0, 'Neutro'],
    // Saved before shade and sun were exclusive: the larger wins, equal ones cancel out.
    [{ shade: 30, sun: 60 }, 60, 'Sol 60 %'],
    [{ shade: 40, sun: 40 }, 0, 'Neutro'],
  ])('%j is %s, "%s"', (weights, balance, text) => {
    expect(shadeSunBalance(weights)).toBe(balance);
    expect(balanceText(balance)).toBe(text);
  });
});
