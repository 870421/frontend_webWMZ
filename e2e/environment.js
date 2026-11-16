// Where the end-to-end test finds the backend and its database, and the environment the backend runs
// with (#161, ADR-034). Every external URL points to the fake services and every key is fake or
// empty, so the backend .env of a developer (with real keys) never reaches the test.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FAKE_ORS_KEY, FAKE_SERVICES_PORT } from './fake-services.js';

export const FRONTEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BACKEND_DIR = path.resolve(FRONTEND_DIR, process.env.BACKEND_DIR || '../backend');
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 3100);
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 5174);
export const FAKE_SERVICES_URL = `http://127.0.0.1:${FAKE_SERVICES_PORT}`;

if (!fs.existsSync(path.join(BACKEND_DIR, 'src', 'server.js'))) {
  throw new Error(
    `No se encuentra el backend en ${BACKEND_DIR}. Clónalo junto a frontend_web o define BACKEND_DIR.`
  );
}

// Without OPEN_METEO_BASE_URL the backend would call the real Open-Meteo: stop before starting it.
const backendEnvSource = fs.readFileSync(path.join(BACKEND_DIR, 'src', 'config', 'env.js'), 'utf8');
if (!backendEnvSource.includes('OPEN_METEO_BASE_URL')) {
  throw new Error(
    `El backend de ${BACKEND_DIR} no admite OPEN_METEO_BASE_URL y llamaría al Open-Meteo real: actualízalo (backend #161).`
  );
}

// The backend dependencies (pg, dotenv) are used from its own node_modules: the frontend does not
// depend on them.
export const requireFromBackend = createRequire(path.join(BACKEND_DIR, 'package.json'));

// E2E_DATABASE_URL in CI; locally the same user, password and host as the backend .env (the
// database of `docker compose up -d db`), with its own database so dev and test data are untouched.
function databaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const envFile = path.join(BACKEND_DIR, '.env');
  const values = fs.existsSync(envFile)
    ? requireFromBackend('dotenv').parse(fs.readFileSync(envFile))
    : {};
  const user = encodeURIComponent(values.DB_USER || 'weathermapz');
  const password = encodeURIComponent(values.DB_PASSWORD || 'weathermapz');
  const host = values.DB_HOST || 'localhost';
  const port = values.DB_PORT || '5432';
  return `postgres://${user}:${password}@${host}:${port}/weathermapz_e2e`;
}

export const DATABASE_URL = databaseUrl();

// Without JWT_SECRET the backend answers 503 to sign-up and login. A new random one per run: no
// secret in the repository and the test never depends on the backend .env (in CI there is none).
const JWT_SECRET = randomBytes(32).toString('hex');

// Explicit empty values matter: dotenv does not override a variable that already exists, so the
// real keys of the backend .env stay out.
export function backendEnvironment(extra = {}) {
  return {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(BACKEND_PORT),
    LOG_LEVEL: 'warn',
    DATABASE_URL,
    JWT_SECRET,
    CORS_ORIGIN: `http://127.0.0.1:${FRONTEND_PORT}`,
    FRONTEND_URL: `http://127.0.0.1:${FRONTEND_PORT}`,
    ORS_API_KEY: FAKE_ORS_KEY,
    OPENROUTESERVICE_API_KEY: '',
    OPENROUTESERVICE_GEOCODING_BASE_URL: `${FAKE_SERVICES_URL}/pelias/v1`,
    OPENROUTESERVICE_DIRECTIONS_BASE_URL: `${FAKE_SERVICES_URL}/ors/v2/directions`,
    OPEN_METEO_BASE_URL: `${FAKE_SERVICES_URL}/open-meteo/v1`,
    LLM_API_KEY: '',
    LLM_BASE_URL: `${FAKE_SERVICES_URL}/llm/v1`,
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    IDEZAR_WFS_URL: `${FAKE_SERVICES_URL}/idezar`,
    OVERPASS_URL: `${FAKE_SERVICES_URL}/overpass`,
    ...extra,
  };
}
