# PBI-20: ayudas contextuales y tutorial guiado

La interfaz ofrece botones de información junto a la selección de puntos, las preferencias (una
sola ayuda para «¿Cómo prefieres ir?» y «Según el tiempo de hoy», que van en la misma fila), sombra
o sol, viento y parques (explica qué hace «Evitar el viento» y qué hace «Por parques») y el tiempo
adicional. Se pueden activar con ratón o teclado; el texto se cierra al pulsar fuera o Escape. Al
pasar el ratón solo se oscurece el icono, sin círculo de fondo.

El tutorial se inicia la primera vez que una cuenta autenticada abre la aplicación. Consta de nueve
pasos: origen y destino; preferencias; «Según el tiempo de hoy»; tiempo adicional; «Calcula y
compara», con una simulación de la comparación (rutas de ejemplo que se pueden elegir); navegación;
tiempo actual, que despliega y resalta el panel «Tiempo ahora»; favoritos en el perfil; y cómo
repetir el tutorial desde el perfil. Se puede avanzar, retroceder o saltar, y se vuelve a abrir desde
«Ver tutorial» en el menú de perfil. En móvil el panel se expande durante la guía y la tarjeta se
coloca en la mitad de la pantalla que no ocupa el elemento resaltado. El resaltado y la tarjeta se
reposicionan al cambiar el tamaño o desplazar la pantalla.

Mejoras tras la revisión del equipo (rama `feature/mejoras-tutorial`): se retiran el botón «Te ayudo
paso a paso» del panel, la fila «Ayuda sobre cómo elegir los puntos» (en móvil pisaba la cabecera) y
los botones de información sueltos junto a «Calcular ruta» e «Iniciar ruta»; y se quitan los puntos
de progreso de la tarjeta, que en el último paso formaban una barra (queda «Paso N de 9»).

El menú del perfil también abre Favoritos. Se ha retirado el botón duplicado del panel izquierdo;
el diálogo de favoritos conserva sus operaciones y comportamiento.

La guía está implementada con componentes propios de React (`GuidedTour` e `InfoButton`) para
ajustarse al panel móvil desplegable y a la tarjeta anclada junto al control en escritorio; no se
añade una librería externa de tours. El diálogo anuncia el paso a lectores de pantalla, conserva el
foco dentro de la guía y permite saltarla con Escape.

## Estado de tutorial por cuenta

El backend expone `PATCH /api/auth/me/tutorial`, protegido por autenticación. Recibe
`{"status":"completed"}` al terminar o `{"status":"skipped"}` al saltar. El estado aparece
después en `GET /api/auth/me` y se guarda en `users.tutorial_status`. La migración es
`20261125000001-add-tutorial-status`; admite `NULL`, `completed` y `skipped`.

Una cuenta antigua o nueva con estado `NULL` recibe la guía de inicio. Si falla el guardado, la guía
permanece abierta y muestra el error para que el usuario pueda reintentarlo.

## Verificación

- Frontend: `npm run ci` (lint, formato, Jest y build).
- Backend: `npm run ci` (lint, formato, sintaxis y Jest).
- Persistencia: `npm run db:migrate:test` y
  `npx jest --config jest.integration.config.js src/tests/integration/tutorialStatus.test.js --runInBand`.
- Resultado al preparar los PR: frontend `npm run ci` (49 suites, 420 tests y build superados);
  backend `npm run ci` (65 suites, 770 tests superados); integración PostgreSQL (1 suite, 1 test).
- Accesos de favoritos y del último paso meteorológico: `src/app/App.test.jsx`,
  `src/features/auth/UserMenu.test.jsx` y `src/features/weather/WeatherPanel.test.jsx`.
