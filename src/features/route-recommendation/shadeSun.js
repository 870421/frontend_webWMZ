// Shade and sun are the two ends of one scale (ADR-030): -100 is all shade, 0 neutral and 100 all
// sun. The API keeps two weights, `shade` and `sun`, and at most one of them is above 0. Since
// PBI-18 only the card of the provisional "Según el tiempo" (the recommended route of PBI-9.1)
// shows the weights, until PBI-21 (ADR-036).

export const SHADE_SUN_MAX = 100;

// Weights sent before both were exclusive: the larger one wins, and equal ones cancel out (as they
// did in the cost, ADR-023).
export function shadeSunBalance({ shade = 0, sun = 0 } = {}) {
  if (shade > sun) return -shade;
  if (sun > shade) return sun;
  return 0;
}

export function balanceText(balance) {
  if (balance < 0) return `Sombra ${-balance} %`;
  if (balance > 0) return `Sol ${balance} %`;
  return 'Neutro';
}
