import { isInsideZaragoza, MAP_BOUNDS } from './zaragozaArea.js';

describe('zaragozaArea', () => {
  it.each([
    ['la plaza del Pilar', 41.656, -0.878, true],
    ['el borde exacto del término', 41.8103, -0.685, true],
    ['Madrid', 40.4168, -3.7038, false],
    ['justo al norte del término', 41.82, -0.88, false],
    ['justo al este del término', 41.65, -0.68, false],
  ])('%s', (_name, lat, lng, expected) => {
    expect(isInsideZaragoza({ lat, lng })).toBe(expected);
  });

  it('el mapa deja un margen alrededor del término municipal', () => {
    const [[south, west], [north, east]] = MAP_BOUNDS;
    expect(isInsideZaragoza({ lat: south, lng: west })).toBe(false);
    expect(isInsideZaragoza({ lat: north, lng: east })).toBe(false);
    expect(north - south).toBeLessThan(0.5);
    expect(east - west).toBeLessThan(0.6);
  });
});
