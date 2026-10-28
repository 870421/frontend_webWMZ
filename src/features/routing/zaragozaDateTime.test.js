import { getZaragozaDateTime } from './zaragozaDateTime.js';

describe('Zaragoza civil time', () => {
  it('uses Europe/Madrid in summer and winter', () => {
    expect(getZaragozaDateTime(new Date('2026-06-21T12:05:00Z'))).toEqual({
      date: '2026-06-21',
      time: '14:05',
      timeZone: 'Europe/Madrid',
    });
    expect(getZaragozaDateTime(new Date('2026-12-21T12:05:00Z'))).toEqual({
      date: '2026-12-21',
      time: '13:05',
      timeZone: 'Europe/Madrid',
    });
  });
});
