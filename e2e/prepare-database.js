// Prepares the database of the end-to-end test (#161, ADR-034): creates it from scratch, applies the
// backend migrations, loads the mini-dataset of scenario.js (no import of the whole of Zaragoza) and
// runs the same precalculations as production (association, vegetation and openness).
// Run by `npm run e2e` before Playwright starts the servers.
import { execFileSync } from 'node:child_process';

import {
  BACKEND_DIR,
  DATABASE_URL,
  backendEnvironment,
  requireFromBackend,
} from './environment.js';
import { BUILDINGS, GREEN_AREAS, SEGMENTS, TREES } from './scenario.js';

const { Client } = requireFromBackend('pg');

const databaseName = new URL(DATABASE_URL).pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(databaseName) || !databaseName.includes('e2e')) {
  // The database is dropped on every run: refuse anything that is not clearly the e2e one.
  throw new Error(`La base de datos del e2e debe llevar "e2e" en el nombre: "${databaseName}".`);
}

function maintenanceUrl() {
  const url = new URL(DATABASE_URL);
  url.pathname = '/postgres';
  return url.toString();
}

async function recreateDatabase() {
  const client = new Client({ connectionString: maintenanceUrl() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `El e2e necesita PostgreSQL/PostGIS (${error.message}). En local: "docker compose up -d db" en el backend.`
    );
  }
  try {
    await client.query(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await client.end();
  }
}

function runInBackend(command, args) {
  execFileSync(command, args, {
    cwd: BACKEND_DIR,
    env: backendEnvironment(),
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });
}

const point = ([lng, lat]) => `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
const box = ([minLng, minLat, maxLng, maxLat]) =>
  `ST_Multi(ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`;

async function loadMiniDataset() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    // The precalculations check that each dataset was imported, as after "npm run import:all".
    await client.query(
      `INSERT INTO import_runs (dataset, source_url, finished_at, source_count, imported_count, status)
       VALUES ('streets', 'e2e', now(), $1, $1, 'success'), ('buildings', 'e2e', now(), $2, $2, 'success'),
         ('trees', 'e2e', now(), $3, $3, 'success'), ('green_areas', 'e2e', now(), $4, $4, 'success')`,
      [SEGMENTS.length, BUILDINGS.length, TREES.length, GREEN_AREAS.length]
    );
    for (const [index, [sourceId, from, to]] of SEGMENTS.entries()) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO street_segments (source, source_id, osm_way_id, name, highway, geom, length_m)
         SELECT 'e2e', $1, $2, 'Calle de Prueba', 'footway', g, ST_Length(g::geography)
         FROM (SELECT ST_MakeLine(${point(from)}, ${point(to)}) AS g) AS line`,
        [sourceId, index + 1]
      );
    }
    for (const [sourceId, bounds, heightM] of BUILDINGS) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO buildings (source, source_id, height_m, height_source, geom)
         VALUES ('e2e', $1, $2, 'measured', ${box(bounds)})`,
        [sourceId, heightM]
      );
    }
    for (const [sourceId, coordinates] of TREES) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO trees (source, source_id, crown_diameter_m, geom)
         VALUES ('e2e', $1, 6, ${point(coordinates)})`,
        [sourceId]
      );
    }
    for (const [sourceId, bounds] of GREEN_AREAS) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO green_areas (source, source_id, kind, name, geom)
         VALUES ('e2e', $1, 'park', 'Parque de Prueba', ${box(bounds)})`,
        [sourceId]
      );
    }
  } finally {
    await client.end();
  }
}

await recreateDatabase();
runInBackend('npx', ['sequelize-cli', 'db:migrate']);
await loadMiniDataset();
runInBackend('node', ['src/cli/associate.js']);
runInBackend('node', ['src/cli/computeVegetation.js']);
runInBackend('node', ['src/cli/computeOpenness.js']);
// eslint-disable-next-line no-console
console.log(`Base de datos del e2e preparada: ${databaseName}`);
