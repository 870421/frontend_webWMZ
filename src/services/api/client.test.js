import { apiRequest } from './client.js';

describe('apiRequest', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('uses the configured base and forwards cancellation and merged headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    const signal = new AbortController().signal;
    await expect(apiRequest('/geocoding/autocomplete', { signal, headers: { Accept: 'application/json' } }))
      .resolves.toEqual({ results: [] });
    expect(global.fetch).toHaveBeenCalledWith('/api/geocoding/autocomplete', {
      signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    });
  });
  it.each([[429, 'busy'], [503, 'not configured'], [504, 'timed out'], [502, 'unavailable']])(
    'provides a safe message for status %s', async (status, message) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
      await expect(apiRequest('/geocoding/autocomplete')).rejects.toThrow(message);
    }
  );
});
