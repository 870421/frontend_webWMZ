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
  it.each([[429, 'ocupada'], [503, 'no está configurada'], [504, 'tardado demasiado'], [502, 'no está disponible']])(
    'provides a safe message for status %s', async (status, message) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
      await expect(apiRequest('/geocoding/autocomplete')).rejects.toThrow(message);
    }
  );
  it('supports endpoint-specific errors without forwarding client options to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 504 });
    await expect(apiRequest('/routes/fastest', {
      method: 'POST',
      errorMessages: { 504: 'Tiempo de ruta agotado.' },
      fallbackErrorMessage: 'Ruta no disponible.'
    })).rejects.toThrow('Tiempo de ruta agotado.');
    expect(global.fetch).toHaveBeenCalledWith('/api/routes/fastest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    });
  });
});
