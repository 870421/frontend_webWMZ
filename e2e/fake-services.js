// Fake external services of the end-to-end test (#161, ADR-034): OpenRouteService (directions and
// Pelias geocoding), Open-Meteo and the language model of the assistant. The backend reaches them
// through its *_BASE_URL variables, so the test never calls a real provider nor uses a real key.
// Any other path answers 404 and is reported in /__requests, so the test can fail on it.
import http from 'node:http';
import { pathToFileURL } from 'node:url';

import { PLACES, ROUTES, WEATHER } from './scenario.js';

export const FAKE_SERVICES_PORT = Number(process.env.E2E_FAKE_SERVICES_PORT || 4010);
export const FAKE_ORS_KEY = 'e2e-fake-key';

const requests = { directions: 0, autocomplete: 0, reverse: 0, weather: 0, llm: 0, unexpected: [] };

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(data));
  });
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function routeFeature({ coordinates, distance, duration }) {
  const last = coordinates.length - 1;
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: {
      summary: { distance, duration },
      segments: [
        {
          distance,
          duration,
          steps: [
            {
              instruction: 'Dirígete al sur por Calle de Prueba',
              name: 'Calle de Prueba',
              distance,
              duration,
              way_points: [0, last],
            },
            {
              instruction: 'Has llegado a tu destino',
              name: '-',
              distance: 0,
              duration: 0,
              way_points: [last, last],
            },
          ],
        },
      ],
    },
  };
}

async function directions(request, response) {
  if (request.headers.authorization !== FAKE_ORS_KEY) {
    send(response, 401, { error: 'unexpected key' });
    return;
  }
  requests.directions += 1;
  const body = JSON.parse((await readBody(request)) || '{}');
  const routes = body.alternative_routes ? [ROUTES.fastest, ROUTES.alternative] : [ROUTES.fastest];
  send(response, 200, { type: 'FeatureCollection', features: routes.map(routeFeature) });
}

function autocomplete(url, response) {
  requests.autocomplete += 1;
  const text = normalize(url.searchParams.get('text') || '');
  const features = Object.values(PLACES)
    .filter(({ label }) => normalize(label).includes(text))
    .map(({ id, label, coordinates }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates },
      properties: { gid: id, label, name: label.split(',')[0] },
    }));
  send(response, 200, { type: 'FeatureCollection', features });
}

function weather(response) {
  requests.weather += 1;
  // Local time of Zaragoza, as Open-Meteo returns it with timezone=Europe/Madrid.
  const time = new Date()
    .toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' })
    .slice(0, 16)
    .replace(' ', 'T');
  send(response, 200, {
    timezone: 'Europe/Madrid',
    current: {
      time,
      temperature_2m: WEATHER.temperature,
      apparent_temperature: WEATHER.apparentTemperature,
      wind_speed_10m: WEATHER.windSpeed,
      wind_gusts_10m: WEATHER.windGusts,
      wind_direction_10m: WEATHER.windDirection,
      weather_code: WEATHER.weatherCode,
    },
    current_units: {
      temperature_2m: '°C',
      apparent_temperature: '°C',
      wind_speed_10m: 'km/h',
      wind_gusts_10m: 'km/h',
      wind_direction_10m: '°',
    },
  });
}

export function createFakeServices() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const route = `${request.method} ${url.pathname}`;
    if (route === 'GET /health') send(response, 200, { status: 'ok' });
    else if (route === 'GET /__requests') send(response, 200, requests);
    else if (route === 'POST /ors/v2/directions/foot-walking/geojson')
      await directions(request, response);
    else if (route === 'GET /pelias/v1/autocomplete') autocomplete(url, response);
    else if (route === 'GET /pelias/v1/reverse') {
      requests.reverse += 1;
      send(response, 200, { type: 'FeatureCollection', features: [] });
    } else if (route === 'GET /open-meteo/v1/forecast') weather(response);
    else {
      // The assistant is not in the happy path: the backend runs without LLM_API_KEY. A call here
      // would be a change in the backend worth noticing.
      if (url.pathname.startsWith('/llm/')) requests.llm += 1;
      requests.unexpected.push(route);
      send(response, 404, { error: 'unexpected request' });
    }
  });
}

// `node e2e/fake-services.js` starts it (Playwright does it through webServer).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createFakeServices().listen(FAKE_SERVICES_PORT, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`Fake external services on http://127.0.0.1:${FAKE_SERVICES_PORT}`);
  });
}
