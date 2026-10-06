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
