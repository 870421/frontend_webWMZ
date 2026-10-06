# WeatherMapZ Frontend

React + Vite frontend for WeatherMapZ.

## Requirements

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

The development server runs on <http://localhost:5173>.

## Test

```bash
npm test
```

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

## Preview Production Build

```bash
npm run preview
```

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
