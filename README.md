# WeatherMapZ Frontend

Frontend de WeatherMapZ con React + Vite.

## Requisitos

- Node.js 22 o superior
- npm

## Instalación

```bash
npm install
cp .env.example .env
```

## Desarrollo

```bash
npm run dev
```

El servidor de desarrollo se sirve en <http://localhost:5173>.

## Tests

```bash
npm test
```

## Build de producción
=======
## Lint

```bash
npm run lint
```

ESLint checks the project using an Airbnb-compatible flat configuration for modern
ESLint versions, including React Hooks rules.

## Format

Format the project automatically with Prettier:

```bash
npm run format
```

Check formatting without changing files:

```bash
npm run format:check
```

## Production Build

```bash
npm run build
```

## Previsualizar el build de producción

```bash
npm run preview
```

## Variables de entorno

- `VITE_API_BASE_URL`: URL base de la API del backend; por defecto `/api`. Vite redirige las
  peticiones locales a `/api` hacia `http://localhost:3000`; `API_PROXY_TARGET` cambia ese destino
  en desarrollo (Compose usa `http://backend:3000`). En producción, el servidor debe redirigir
  `/api` al backend o hay que indicar una URL pública de la API al hacer el build. Nunca pongas una
  clave de un proveedor en una variable `VITE_`.

## Comprobaciones de la PBI-1

- Selecciona origen y destino con el mapa, con las sugerencias de direcciones o con el GPS; mezcla
  métodos.
- Al editar un campo se borra el marcador anterior hasta que se elige otro lugar.
- Clear borra un borrador o un punto; Reset además cancela el GPS pendiente y borra los mensajes.
- El autocompletado empieza a partir de 3 caracteres y 350 ms, con estados de carga, vacío y error.
- Usa las flechas y Enter para elegir una sugerencia; Escape o perder el foco cierra la lista.
- Comprueba anchos de 375, 390, 768, 1366 y 1920 px, etiquetas largas y el zoom del navegador.
- El GPS necesita HTTPS o localhost. En un móvil, HTTP normal por la red local mostrará el error de
  contexto no seguro; usa HTTPS para probar el permiso y la ubicación.
- Los marcadores de GPS tienen un círculo de referencia fijo de 50 metros, no una estimación de
  precisión. Corregir un punto en el mapa, Clear y Reset eliminan su círculo.
- El cálculo de rutas queda fuera de la PBI-1 a propósito.
=======

## Continuous integration

Run the same checks used by GitHub Actions locally with:

```bash
npm run ci
```

This command runs ESLint, checks Prettier formatting, executes the complete Jest suite
and creates the production build.
The GitHub Actions workflow runs automatically for every pull request targeting
`main`.

## Environment

- `VITE_API_BASE_URL`: backend API base URL, default `/api`. Vite proxies local `/api`
  requests to `http://localhost:3000`; `API_PROXY_TARGET` overrides that development
  target (Compose uses `http://backend:3000`). A production host must proxy `/api`
  to the backend or provide a public API URL at build time. Never use a provider key
  in a `VITE_` variable.

## PBI-1 checks

- Select origin/destination by map, address suggestions or GPS; mix methods.
- Editing clears the old marker until another place is selected.
- Clear removes a draft or point; Reset also cancels pending GPS and clears messages.
- Autocomplete starts after 3 characters and 350 ms, with loading, empty and error states.
- Use Arrow keys and Enter to select a suggestion; Escape or blur closes the list.
- Check 375, 390, 768, 1366 and 1920 px widths, long labels and browser zoom.
- GPS requires HTTPS or localhost. On a phone, plain HTTP over a LAN will show the
  secure-context error; use HTTPS to test permission and location behavior.
- GPS markers have a fixed 50-metre reference circle, not an accuracy estimate.
  Correcting a point on the map, Clear and Reset remove its circle.
- Route calculation is intentionally outside PBI-1.