// Happy path of WeatherMapZ (#161): sign up, log out and log in again, choose the origin and the
// destination with the autocomplete, calculate the fastest route and then the recommended one with
// its reason and the comparison. External services are fake (fake-services.js).
import { expect, test } from '@playwright/test';

import { FAKE_SERVICES_URL, FRONTEND_PORT } from './environment.js';
import { FASTEST_ROUTE_TEXT, PLACES } from './scenario.js';

// 1×1 transparent PNG for the OpenStreetMap tiles: the map is drawn without internet.
const EMPTY_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function blockExternalRequests(page) {
  const blocked = [];
  await page.route('**/*', (route) => {
    const { hostname, port } = new URL(route.request().url());
    if (hostname === '127.0.0.1' && Number(port) === FRONTEND_PORT) return route.continue();
    blocked.push(route.request().url());
    return route.abort();
  });
  // Registered later, so it wins over the route above for the tiles.
  await page.route(/^https:\/\/[abc]\.tile\.openstreetmap\.org\//, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: EMPTY_TILE })
  );
  return blocked;
}

async function choosePlace(page, field, text, place) {
  const input = page.getByRole('combobox', { name: field });
  await input.fill(text);
  await page.getByRole('option', { name: place.label }).click();
  await expect(input).toHaveValue(place.label);
}

test('sign up, log in, choose the points and compare the fastest and recommended routes', async ({
  page,
  request,
}) => {
  const blocked = await blockExternalRequests(page);
  const user = {
    name: 'Prueba E2E',
    email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`,
    password: `e2e-${Math.random().toString(36).slice(2)}`,
  };

  // Sign up: the account starts the session.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.getByRole('button', { name: 'Regístrate' }).click();
  await page.getByLabel('Nombre').fill(user.name);
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const userMenu = page.getByRole('button', { name: `Menú de usuario de ${user.name}` });
  await expect(userMenu).toBeVisible();

  // Log out and log in with the new account.
  await userMenu.click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(userMenu).toBeVisible();

  // Focusing a field offers «Mi ubicación» first, also without text (#178).
  await page.getByRole('combobox', { name: 'Origen' }).click();
  await expect(page.getByRole('option').first()).toHaveText('Mi ubicación');

  // Origin and destination with the autocomplete.
  await choosePlace(page, 'Origen', 'Prueba Norte', PLACES.origin);
  await choosePlace(page, 'Destino', 'Prueba Sur', PLACES.destination);

  // Fastest route: the first route of a new account.
  await expect(page.getByRole('button', { name: 'Rápida', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.getByRole('button', { name: 'Calcular ruta' }).click();
  const summary = page.getByRole('region', { name: 'Ruta rápida' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText(FASTEST_ROUTE_TEXT.distance);
  await expect(summary).toContainText(FASTEST_ROUTE_TEXT.duration);

  // Recommended route: its reason (strong cierzo of the fake weather) and the comparison.
  await page.getByRole('button', { name: 'Recomendada', exact: true }).click();
  await page.getByRole('button', { name: 'Calcular ruta' }).click();
  const recommendation = page.getByRole('region', { name: /^Recomendada:/ });
  await expect(recommendation).toBeVisible();
  await expect(recommendation.getByRole('status')).toContainText(/cierzo de 40 km\/h/);
  await expect(recommendation.getByRole('status')).toContainText('se evita el viento de cara');
  const comparison = page.getByRole('region', { name: 'Comparación' });
  await expect(comparison).toBeVisible();
  const fastestOption = comparison.getByRole('button', { name: /Más rápida/ });
  await expect(fastestOption).toContainText(FASTEST_ROUTE_TEXT.duration);
  await expect(fastestOption).toContainText(FASTEST_ROUTE_TEXT.distance);
  // The wind exposure comes from the street segments and their openness in PostGIS: the backend
  // found the mini-dataset along the route.
  await expect(fastestOption).toContainText(/\d+ % de exposición al viento/);
  await expect(comparison.getByRole('button', { name: /Recomendada/ })).toBeVisible();

  // Nothing left the machine: the browser only reached the frontend and the backend only reached
  // the fake services, which saw the expected calls and nothing else.
  expect(blocked).toEqual([]);
  const calls = await (await request.get(`${FAKE_SERVICES_URL}/__requests`)).json();
  expect(calls.autocomplete).toBeGreaterThan(0);
  expect(calls.directions).toBeGreaterThanOrEqual(2);
  expect(calls.weather).toBeGreaterThan(0);
  expect(calls.llm).toBe(0);
  expect(calls.unexpected).toEqual([]);
});
