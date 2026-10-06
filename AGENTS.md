# WeatherMapZ Frontend - Instrucciones para Codex

Este repositorio contiene el frontend de WeatherMapZ.

Antes de hacer cambios importantes, lee la documentación global de WeatherMapZ
y este fichero.

## Stack

- React
- Vite
- PWA
- Leaflet
- OpenStreetMap

## Diseño responsive

Usa diseño web responsive Mobile-First.

La MISMA aplicación debe funcionar correctamente en:

- smartphones
- tablets
- navegadores de escritorio/portátil

No crees aplicaciones separadas para móvil y escritorio.

Todas las interacciones relevantes deben funcionar con pantallas táctiles y con ratón y teclado.

## Responsabilidades

El frontend se encarga de:

- mapa interactivo
- interacción de origen/destino
- visualización de rutas
- comparación de rutas
- información de confort
- estados de carga/error
- interfaz responsive
- comunicación con la API del backend

NO implementes aquí el cálculo de rutas ni los cálculos de confort climático.

## UX del mapa

El mapa es el elemento central de la aplicación.

Móvil:
- prioriza la visibilidad del mapa
- controles compactos
- paneles plegables/bottom sheets donde corresponda

Escritorio:
- las barras laterales o los paneles desplegados pueden aprovechar el espacio adicional

La funcionalidad debe ser equivalente en todos los tamaños de pantalla.

## Arquitectura

Prefiere una separación clara entre:

- componentes de presentación
- features
- hooks
- API/servicios
- utilidades

No compliques la estructura de carpetas antes de que haga falta.

## Comunicación con la API

Centraliza la comunicación con el backend.

No repartas llamadas fetch/API por los componentes de presentación.

No te inventes endpoints del backend ni propiedades de las respuestas.

Si no existe el contrato de API que necesitas, defínelo o confírmalo antes
de implementar la integración en el frontend.

## Accesibilidad

Usa:

- HTML semántico
- controles accesibles
- navegación por teclado donde corresponda
- contraste suficiente
- etiquetas con significado

No distingas las rutas solo por el color.

## Testing

Usa Jest + React Testing Library.

Cobertura automática mínima: 50 %.
Objetivo: 75 %.

## Configuración

No escribas directamente en el código URLs del backend, credenciales ni valores específicos de un entorno.

Usa variables de entorno donde corresponda.

## Documentación obligatoria por PBI

- Al terminar cada PBI, y antes de abrir su pull request, añade su entrada al principio del
  "Registro de PBIs" del `docs/DECISIONS.md` del workspace (documentación global, fuera de este
  repositorio), con: título, fecha, rama y estado (En revisión / Fusionada #N); qué se ha hecho,
  en lenguaje claro; las condiciones de satisfacción marcadas, con dónde se comprueba cada una
  (test, comando o query); los datos y resultados reales; los cambios técnicos (tablas,
  migraciones, comandos npm, variables de entorno, endpoints); enlaces a los ADR tomados; lo
  pendiente y los riesgos para siguientes PBIs; y cómo verificarlo a mano.
- Registra cada decisión técnica no obvia como un ADR nuevo en el mismo fichero. Si una decisión
  cambia, añade un ADR nuevo y marca el anterior como "Sustituido por ADR-00X". Nunca borres el
  histórico.
- Actualiza TODOS los ficheros Markdown afectados por el cambio: `DATA_SOURCES.md` si cambian
  fuentes o datos, `README.md` si cambian el arranque, las variables de entorno, los comandos, el
  esquema o la checklist manual, y la documentación de la API si cambian endpoints.
- Antes de cerrar la PBI, haz un grep en todos los ficheros Markdown de los términos y cifras que
  hayan cambiado, para no dejar información desactualizada en ninguno.
- La descripción del pull request va en `PR-<pbi>.md` (solo en local, ignorado por Git) y es un
  resumen breve que enlaza a la entrada de la PBI en el `docs/DECISIONS.md` del workspace.
