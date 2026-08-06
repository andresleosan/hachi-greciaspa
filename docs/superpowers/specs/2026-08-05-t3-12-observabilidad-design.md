# T3.12 Observabilidad: error tracking y logs

## Estado

Diseño aprobado por el operador el 2026-08-05. La implementación queda separada de la creación de la cuenta Sentry: el código podrá quedar preparado con `VITE_SENTRY_DSN` vacío y la activación operativa requerirá un DSN válido.

## Objetivo

Detectar errores JavaScript no manejados en el frontend y errores relevantes de Cloud Functions sin exponer datos personales ni alterar los flujos existentes de reservas, email o reintentos.

## Alcance

- Integrar Sentry en el frontend React.
- Integrar Sentry de forma opcional en Cloud Functions Node.js.
- Mantener Cloud Logging como destino principal de logs operativos de Functions.
- Capturar `window.error`, `unhandledrejection` y errores de renderizado React.
- Sanitizar eventos antes de enviarlos.
- Documentar configuración, costos, activación y degradación esperada.
- Agregar pruebas unitarias de configuración y sanitización.

## Fuera de alcance

- Session Replay.
- Tracing y profiling.
- `Sentry.setUser` o identificación persistente de clientes.
- Migraciones de Firestore.
- Cambios en reglas de seguridad.
- Cambios en la lógica de reintentos de Resend.
- Configuración de una cuenta Sentry, facturación o alertas externas por parte del repositorio.

## Arquitectura

### Frontend

Crear un módulo aislado `src/observability/sentry.ts` con una API mínima:

- `initSentry()` inicializa el SDK solo cuando `VITE_SENTRY_DSN` existe y el entorno no usa emuladores.
- `captureException(error, context?)` captura errores explícitos mediante el SDK activo o conserva un log local sanitizado cuando Sentry está desactivado.
- El arranque llama a `initSentry()` antes de montar React.
- `Sentry.ErrorBoundary` cubre el árbol React para errores de renderizado.
- Los handlers globales del SDK cubren errores no manejados y rejections no manejadas.

La inicialización debe ser tolerante a fallos: un SDK ausente, un DSN inválido o un fallo de transporte no puede impedir que la aplicación arranque ni convertir un error secundario de observabilidad en una caída de la aplicación.

### Cloud Functions

Agregar `@sentry/node` en `functions/package.json` y un módulo de inicialización opcional para Functions. La inicialización ocurrirá al cargar `functions/src/index.ts`, condicionada por la variable `SENTRY_DSN` administrada por el entorno de Functions.

La integración no reemplazará `console.info`, `console.warn` ni `console.error`: Cloud Logging seguirá recibiendo mensajes estructurados. Sentry se usará para excepciones y contexto de diagnóstico, no como base de datos operacional.

Los triggers existentes conservarán sus límites de retries, idempotencia y estados de Firestore. Ningún error de Sentry podrá provocar un reintento adicional de una Function de negocio.

## Privacidad y sanitización

- Configurar `sendDefaultPii: false`.
- No llamar a `Sentry.setUser`.
- No enviar emails, contraseñas, tokens Firebase, cookies, headers de autorización, payloads de formularios, documentos Firestore ni URLs con query string.
- Remover o enmascarar campos sensibles de `event.request`, `event.user`, `event.extra`, breadcrumbs y contexto adicional.
- Usar únicamente tags no identificables, como entorno, versión de release y nombre de Function.
- Aplicar `beforeSend` como última barrera antes del transporte.
- No colocar `RESEND_API_KEY` ni otros secretos en variables `VITE_*` ni en eventos del frontend.

El DSN de Sentry no se considera secreto privado del frontend, pero no se hardcodeará: se documentará mediante `VITE_SENTRY_DSN` en `.env.example` y configuración equivalente para Functions.

## Configuración

Frontend:

```text
VITE_SENTRY_DSN=
```

Functions:

- `SENTRY_DSN` como variable de entorno o secreto administrado por el entorno de Functions para el DSN backend.
- El mecanismo de despliegue se documentará sin registrar el valor en git ni en logs.

Mientras las variables estén vacías, la instrumentación permanecerá desactivada y el proyecto seguirá funcionando con logs locales o Cloud Logging.

## Alertas y operación

- Sentry recibirá alertas por email según la configuración del plan activo.
- Cloud Functions conservará logs estructurados en Cloud Logging.
- La alerta de Cloud Monitoring para más de 5 errores de Functions por minuto forma parte del gate operativo externo y no se marcará como configurada desde el repositorio.
- La cuenta Sentry, el proyecto, el DSN, destinatarios de alertas y cualquier plan pago deben ser configurados por el operador.

## Costo

Según la página oficial de precios consultada el 2026-08-05, el plan Developer de Sentry es gratuito e incluye 5.000 errores, 5 GB de logs y 5 millones de spans. El plan Team parte de USD 26/mes con facturación anual y 50.000 errores incluidos.

La implementación inicial desactiva tracing, profiling y Session Replay para mantener el consumo dentro del caso de uso mínimo. Estimación inicial: USD 0/mes mientras el volumen permanezca dentro del plan Developer. No hay alerta de presupuesto configurada aún; el operador debe configurar límites o notificaciones en Sentry antes de considerar el gate operativo cerrado.

## Pruebas y aceptación

Agregar pruebas unitarias para:

- Deshabilitar Sentry cuando el DSN está vacío.
- Inicializar Sentry cuando existe DSN y no se usa el emulador.
- No inicializar Sentry en modo emulador.
- Eliminar emails, tokens, passwords, headers y query strings de un evento.
- Tolerar errores del transporte sin propagar una excepción al flujo de negocio.
- Mantener el comportamiento actual de las Functions cuando Sentry está desactivado.

La verificación local requerida será:

```text
npm run test:client
npx tsc --noEmit
npm run build
npm run rules:test
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run build
npm run release:preflight
```

Sin DSN real no se afirmará que el transporte a Sentry fue verificado. La verificación posterior del proyecto Sentry, recepción de un evento controlado y alertas seguirá siendo un gate externo.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Envío accidental de PII | `sendDefaultPii: false`, ausencia de usuario, sanitización central y prueba de regresión |
| Sentry interrumpe el arranque | Inicialización condicional y tolerante a fallos |
| Sentry provoca retries de Functions | Captura aislada de la lógica de negocio; no se lanza por fallo del SDK |
| Crecimiento de costo | Plan Developer inicial, sin features de alto volumen y revisión del uso antes de cambiar de plan |
| DSN no disponible | Feature flag natural por variable vacía; logs existentes permanecen operativos |

## Criterio de cierre

T3.12 podrá pasar a revisión cuando el código, las pruebas, la documentación y el preflight local estén verdes. Podrá pasar a aprobada operativa únicamente después de que el operador proporcione un DSN válido, se confirme la recepción de un evento controlado, se revise la ausencia de PII y se configure la alerta de Cloud Monitoring pendiente.
